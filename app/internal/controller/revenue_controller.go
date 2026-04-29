package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func GetRevenueSummary(c *gin.Context) {
	projectID, filters, err := parseRevenueRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid revenue query", err.Error()))
		return
	}

	summary, err := services.GetRevenueSummary(projectID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch revenue summary", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Revenue summary fetched successfully", gin.H{
		"filters": filters,
		"summary": summary,
	}))
}

func GetRevenueTimeSeries(c *gin.Context) {
	projectID, filters, err := parseRevenueRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid revenue query", err.Error()))
		return
	}

	series, err := services.GetRevenueTimeSeries(projectID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch revenue time series", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Revenue time series fetched successfully", gin.H{
		"filters": filters,
		"series":  series,
	}))
}

func GetRevenueByProduct(c *gin.Context) {
	projectID, filters, err := parseRevenueRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid revenue query", err.Error()))
		return
	}

	rows, err := services.GetRevenueByProduct(projectID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch product revenue", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Product revenue fetched successfully", gin.H{
		"filters":    filters,
		"by_product": rows,
	}))
}

func ExportRevenuePDF(c *gin.Context) {
	projectID, filters, err := parseRevenueRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid revenue query", err.Error()))
		return
	}

	report, err := services.BuildRevenueReport(projectID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to build revenue report", err.Error()))
		return
	}

	pdfBytes, err := services.GenerateRevenuePDF(report)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to generate revenue PDF", err.Error()))
		return
	}

	filename := fmt.Sprintf("revenue_report_%s_%s_%s.pdf", c.Query("from"), c.Query("to"), strings.ToLower(filters.Granularity))
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

func parseRevenueRequest(c *gin.Context) (uint, services.RevenueFilters, error) {
	projectID, err := getCaptainProjectIDFromContext(c)
	if err != nil {
		return 0, services.RevenueFilters{}, err
	}

	topN := 0
	if topStr := strings.TrimSpace(c.Query("top_n")); topStr != "" {
		parsed, parseErr := strconv.Atoi(topStr)
		if parseErr != nil {
			return 0, services.RevenueFilters{}, fmt.Errorf("top_n must be a valid integer")
		}
		topN = parsed
	}

	filters, err := services.ParseRevenueFilters(
		c.Query("from"),
		c.Query("to"),
		c.DefaultQuery("granularity", "day"),
		c.DefaultQuery("timezone", "Asia/Kolkata"),
		topN,
	)
	if err != nil {
		return 0, services.RevenueFilters{}, err
	}

	return projectID, filters, nil
}

func getCaptainProjectIDFromContext(c *gin.Context) (uint, error) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		return 0, fmt.Errorf("user not found in token")
	}

	userID, err := normalizeUint(userIDVal)
	if err != nil {
		return 0, fmt.Errorf("invalid user id in token")
	}

	user, err := services.GetUser(fmt.Sprintf("%d", userID))
	if err != nil {
		return 0, fmt.Errorf("unable to load captain user profile")
	}
	if user.ProjectID == nil || *user.ProjectID == 0 {
		return 0, fmt.Errorf("captain project is not configured")
	}

	return *user.ProjectID, nil
}

func normalizeUint(value interface{}) (uint, error) {
	switch v := value.(type) {
	case uint:
		return v, nil
	case uint32:
		return uint(v), nil
	case uint64:
		return uint(v), nil
	case int:
		if v < 0 {
			return 0, fmt.Errorf("negative value")
		}
		return uint(v), nil
	case int64:
		if v < 0 {
			return 0, fmt.Errorf("negative value")
		}
		return uint(v), nil
	case float64:
		if v < 0 {
			return 0, fmt.Errorf("negative value")
		}
		return uint(v), nil
	case string:
		parsed, err := strconv.ParseUint(v, 10, 64)
		if err != nil {
			return 0, err
		}
		return uint(parsed), nil
	default:
		return 0, fmt.Errorf("unsupported type")
	}
}
