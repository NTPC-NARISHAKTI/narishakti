package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

// Helper function to parse form values
func parseFormValue(valueStr string, target interface{}) error {
	switch target := target.(type) {
	case *uint:
		val, err := strconv.ParseUint(valueStr, 10, 32)
		if err != nil {
			return err
		}
		*target = uint(val)
	case *float64:
		val, err := strconv.ParseFloat(valueStr, 64)
		if err != nil {
			return err
		}
		*target = val
	case *int:
		val, err := strconv.Atoi(valueStr)
		if err != nil {
			return err
		}
		*target = val
	}
	return nil
}

func CreatePost(c *gin.Context) {
	// Manually parse form fields to avoid binding issues with file uploads
	productIDStr := c.PostForm("ProductID")
	priceStr := c.PostForm("Price")
	totalQtyStr := c.PostForm("TotalQty")

	if productIDStr == "" || priceStr == "" || totalQtyStr == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", "Missing required fields"))
		return
	}

	// Parse values
	var post models.Post
	if err := parseFormValue(productIDStr, &post.ProductID); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", "Invalid ProductID"))
		return
	}
	if err := parseFormValue(priceStr, &post.Price); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", "Invalid Price"))
		return
	}
	if err := parseFormValue(totalQtyStr, &post.TotalQty); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", "Invalid TotalQty"))
		return
	}

	// Handle file upload
	file, err := c.FormFile("ProductImg")
	if err == nil && file != nil {
		// Create uploads directory if it doesn't exist
		uploadsDir := "uploads"
		if err := os.MkdirAll(uploadsDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create uploads directory", err.Error()))
			return
		}

		// Generate unique filename
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), "post_image", ext)
		filepath := filepath.Join(uploadsDir, filename)

		if err := c.SaveUploadedFile(file, filepath); err != nil {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to save image", err.Error()))
			return
		}
		post.ProductImg = filepath
	}

	userRole, _ := c.Get("role")
	roleStr, _ := userRole.(string)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	createdBy := uint(userID.(float64))

	err = services.CreatePost(&post, roleStr, createdBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create post", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post created successfully", post))
}

func GetPosts(c *gin.Context) {
	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "0")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 0 // 0 means no limit (return all)
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	projectID := uint(0)
	projectFilterActive := false

	// Captains are always restricted to their own project.
	if isCaptainRole(c) {
		captainProjectID, ok := getCaptainProjectIDForPosts(c)
		if !ok || captainProjectID == 0 {
			c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "Captain project not found"))
			return
		}
		projectID = captainProjectID
		projectFilterActive = true
	} else {
		projectIDStr := c.Query("projectId")
		if projectIDStr != "" {
			parsed, parseErr := strconv.ParseUint(projectIDStr, 10, 32)
			if parseErr == nil && parsed > 0 {
				projectID = uint(parsed)
				projectFilterActive = true
			}
		}
	}

	// If pagination is requested (limit > 0), use paginated version
	if limit > 0 {
		var result interface{}
		if projectFilterActive {
			result, err = services.GetPostsPaginatedByProjectID(limit, offset, projectID)
		} else {
			result, err = services.GetPostsPaginated(limit, offset)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch posts", err.Error()))
			return
		}
		c.JSON(http.StatusOK, utils.SuccessResponse("Posts fetched successfully", result))
		return
	}

	// Otherwise, return all posts (backward compatible)
	var posts interface{}
	if projectFilterActive {
		posts, err = services.GetPostsWithRemainingQtyByProjectID(projectID)
	} else {
		posts, err = services.GetPostsWithRemainingQty()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch posts", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Posts fetched successfully", posts))
}

func GetPost(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post fetched successfully", post))
}

func UpdatePost(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	err = services.UpdatePost(&post, updatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update post", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post updated successfully", post))
}

func DeletePost(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	deletedBy := uint(userID.(float64))

	err = services.DeletePost(&post, deletedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete post", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("Post deleted successfully", nil))
}

func TogglePostActive(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	if isCaptainRole(c) {
		captainProjectID, ok := getCaptainProjectIDForPosts(c)
		if !ok || captainProjectID == 0 || post.Product.ProjectID != captainProjectID {
			c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only update posts in your project"))
			return
		}
	}

	post.Active = !post.Active

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	err = services.UpdatePost(&post, updatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to toggle post status", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post status updated successfully", post))
}

func isCaptainRole(c *gin.Context) bool {
	role, exists := c.Get("role")
	if !exists {
		return false
	}
	roleStr, _ := role.(string)
	return strings.EqualFold(roleStr, "CAPTAIN")
}

func getCaptainProjectIDForPosts(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	captain, err := services.GetUser(fmt.Sprintf("%v", userID))
	if err != nil || captain.ProjectID == nil {
		return 0, false
	}

	return *captain.ProjectID, true
}
