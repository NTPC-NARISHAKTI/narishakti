package services

import (
	"bytes"
	"errors"
	"fmt"
	"marketplace/internal/repositories"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

const (
	defaultTimezone = "Asia/Kolkata"
	defaultTopN     = 100
	maxTopN         = 1000
)

type RevenueFilters struct {
	FromUTC     time.Time
	ToUTC       time.Time
	Timezone    string
	Granularity string
	TopN        int
}

type RevenueSummary struct {
	Currency      string  `json:"currency"`
	TotalRevenue  float64 `json:"total_revenue"`
	TotalQuantity int64   `json:"total_quantity"`
	TotalOrders   int64   `json:"total_orders"`
	TotalProducts int64   `json:"total_products"`
}

type RevenueSeriesPoint struct {
	BucketStart   string  `json:"bucket_start"`
	TotalRevenue  float64 `json:"total_revenue"`
	TotalQuantity int64   `json:"total_quantity"`
	TotalOrders   int64   `json:"total_orders"`
}

type RevenueByProduct struct {
	ProductID        uint    `json:"product_id"`
	ProductName      string  `json:"product_name"`
	ContributionRank int     `json:"contribution_rank"`
	TotalRevenue     float64 `json:"total_revenue"`
	TotalQuantity    int64   `json:"total_quantity"`
	TotalOrders      int64   `json:"total_orders"`
}

type RevenueReportData struct {
	Filters   RevenueFilters       `json:"filters"`
	Summary   RevenueSummary       `json:"summary"`
	Series    []RevenueSeriesPoint `json:"series"`
	ByProduct []RevenueByProduct   `json:"by_product"`
}

func ParseRevenueFilters(fromStr, toStr, granularity, timezone string, topN int) (RevenueFilters, error) {
	if strings.TrimSpace(granularity) == "" {
		granularity = "day"
	}
	granularity = strings.ToLower(strings.TrimSpace(granularity))
	if granularity != "day" && granularity != "week" && granularity != "month" {
		return RevenueFilters{}, errors.New("granularity must be one of: day, week, month")
	}

	loc, normalizedTimezone, err := resolveTimezone(timezone)
	if err != nil {
		return RevenueFilters{}, err
	}

	if strings.TrimSpace(fromStr) == "" || strings.TrimSpace(toStr) == "" {
		return RevenueFilters{}, errors.New("from and to are required in YYYY-MM-DD format")
	}

	fromLocal, err := time.ParseInLocation("2006-01-02", fromStr, loc)
	if err != nil {
		return RevenueFilters{}, errors.New("invalid from date format, expected YYYY-MM-DD")
	}
	toLocal, err := time.ParseInLocation("2006-01-02", toStr, loc)
	if err != nil {
		return RevenueFilters{}, errors.New("invalid to date format, expected YYYY-MM-DD")
	}
	if toLocal.Before(fromLocal) {
		return RevenueFilters{}, errors.New("to date cannot be before from date")
	}

	// Inclusive to-date: convert to exclusive end bound.
	toLocalExclusive := toLocal.Add(24 * time.Hour)
	spanDays := int(toLocalExclusive.Sub(fromLocal).Hours() / 24)
	if err := validateRangeLimit(granularity, spanDays); err != nil {
		return RevenueFilters{}, err
	}

	if topN <= 0 {
		topN = defaultTopN
	}
	if topN > maxTopN {
		topN = maxTopN
	}

	return RevenueFilters{
		FromUTC:     fromLocal.UTC(),
		ToUTC:       toLocalExclusive.UTC(),
		Timezone:    normalizedTimezone,
		Granularity: granularity,
		TopN:        topN,
	}, nil
}

func GetRevenueSummary(projectID uint, filters RevenueFilters) (RevenueSummary, error) {
	row, err := repositories.GetRevenueSummary(projectID, filters.FromUTC, filters.ToUTC)
	if err != nil {
		return RevenueSummary{}, err
	}

	return RevenueSummary{
		Currency:      "INR",
		TotalRevenue:  round2(row.TotalRevenue),
		TotalQuantity: row.TotalQuantity,
		TotalOrders:   row.TotalOrders,
		TotalProducts: row.TotalProducts,
	}, nil
}

func GetRevenueTimeSeries(projectID uint, filters RevenueFilters) ([]RevenueSeriesPoint, error) {
	rows, err := repositories.GetRevenueTimeSeries(projectID, filters.FromUTC, filters.ToUTC, filters.Granularity, filters.Timezone)
	if err != nil {
		return nil, err
	}

	points := make([]RevenueSeriesPoint, 0, len(rows))
	for _, row := range rows {
		points = append(points, RevenueSeriesPoint{
			BucketStart:   row.BucketStart.Format("2006-01-02"),
			TotalRevenue:  round2(row.TotalRevenue),
			TotalQuantity: row.TotalQuantity,
			TotalOrders:   row.TotalOrders,
		})
	}
	return points, nil
}

func GetRevenueByProduct(projectID uint, filters RevenueFilters) ([]RevenueByProduct, error) {
	rows, err := repositories.GetRevenueByProduct(projectID, filters.FromUTC, filters.ToUTC, filters.TopN)
	if err != nil {
		return nil, err
	}

	out := make([]RevenueByProduct, 0, len(rows))
	for i, row := range rows {
		out = append(out, RevenueByProduct{
			ProductID:        row.ProductID,
			ProductName:      row.ProductName,
			ContributionRank: i + 1,
			TotalRevenue:     round2(row.TotalRevenue),
			TotalQuantity:    row.TotalQuantity,
			TotalOrders:      row.TotalOrders,
		})
	}
	return out, nil
}

func BuildRevenueReport(projectID uint, filters RevenueFilters) (RevenueReportData, error) {
	summary, err := GetRevenueSummary(projectID, filters)
	if err != nil {
		return RevenueReportData{}, err
	}
	series, err := GetRevenueTimeSeries(projectID, filters)
	if err != nil {
		return RevenueReportData{}, err
	}
	byProduct, err := GetRevenueByProduct(projectID, filters)
	if err != nil {
		return RevenueReportData{}, err
	}

	return RevenueReportData{
		Filters:   filters,
		Summary:   summary,
		Series:    series,
		ByProduct: byProduct,
	}, nil
}

func GenerateRevenuePDF(report RevenueReportData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(12, 12, 12)
	pdf.AddPage()

	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 8, "Revenue Report")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Timezone: %s", report.Filters.Timezone))
	pdf.Ln(5)
	pdf.Cell(0, 6, fmt.Sprintf("Granularity: %s", prettyGranularity(report.Filters.Granularity)))
	pdf.Ln(5)
	pdf.Cell(0, 6, fmt.Sprintf("Range (UTC): %s to %s", report.Filters.FromUTC.Format(time.RFC3339), report.Filters.ToUTC.Format(time.RFC3339)))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 6, "Summary")
	pdf.Ln(7)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Total Revenue: %.2f %s", report.Summary.TotalRevenue, report.Summary.Currency))
	pdf.Ln(5)
	pdf.Cell(0, 6, fmt.Sprintf("Total Quantity Sold: %d", report.Summary.TotalQuantity))
	pdf.Ln(5)
	pdf.Cell(0, 6, fmt.Sprintf("Total Orders: %d", report.Summary.TotalOrders))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 6, "Revenue by Product")
	pdf.Ln(7)

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(20, 6, "Rank", "1", 0, "R", false, 0, "")
	pdf.CellFormat(65, 6, "Product", "1", 0, "", false, 0, "")
	pdf.CellFormat(30, 6, "Revenue", "1", 0, "R", false, 0, "")
	pdf.CellFormat(20, 6, "Qty", "1", 0, "R", false, 0, "")
	pdf.CellFormat(20, 6, "Orders", "1", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	maxRows := len(report.ByProduct)
	if maxRows > 25 {
		maxRows = 25
	}
	for i := 0; i < maxRows; i++ {
		row := report.ByProduct[i]
		pdf.CellFormat(20, 6, fmt.Sprintf("%d", row.ContributionRank), "1", 0, "R", false, 0, "")
		pdf.CellFormat(65, 6, truncate(row.ProductName, 36), "1", 0, "", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("%.2f", row.TotalRevenue), "1", 0, "R", false, 0, "")
		pdf.CellFormat(20, 6, fmt.Sprintf("%d", row.TotalQuantity), "1", 0, "R", false, 0, "")
		pdf.CellFormat(20, 6, fmt.Sprintf("%d", row.TotalOrders), "1", 1, "R", false, 0, "")
	}

	if len(report.ByProduct) > maxRows {
		pdf.Ln(4)
		pdf.SetFont("Arial", "I", 8)
		pdf.Cell(0, 5, fmt.Sprintf("Showing top %d rows of %d products.", maxRows, len(report.ByProduct)))
	}

	pdf.Ln(8)
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 6, "Time Series")
	pdf.Ln(7)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(45, 6, "Bucket Start", "1", 0, "", false, 0, "")
	pdf.CellFormat(35, 6, "Revenue", "1", 0, "R", false, 0, "")
	pdf.CellFormat(35, 6, "Qty", "1", 0, "R", false, 0, "")
	pdf.CellFormat(35, 6, "Orders", "1", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	maxSeries := len(report.Series)
	if maxSeries > 20 {
		maxSeries = 20
	}
	for i := 0; i < maxSeries; i++ {
		row := report.Series[i]
		pdf.CellFormat(45, 6, row.BucketStart, "1", 0, "", false, 0, "")
		pdf.CellFormat(35, 6, fmt.Sprintf("%.2f", row.TotalRevenue), "1", 0, "R", false, 0, "")
		pdf.CellFormat(35, 6, fmt.Sprintf("%d", row.TotalQuantity), "1", 0, "R", false, 0, "")
		pdf.CellFormat(35, 6, fmt.Sprintf("%d", row.TotalOrders), "1", 1, "R", false, 0, "")
	}

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func validateRangeLimit(granularity string, days int) error {
	switch granularity {
	case "day":
		if days > 93 {
			return errors.New("for day granularity, max range is 93 days")
		}
	case "week":
		if days > 730 {
			return errors.New("for week granularity, max range is 730 days")
		}
	case "month":
		if days > 1826 {
			return errors.New("for month granularity, max range is 1826 days")
		}
	}
	return nil
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func prettyGranularity(granularity string) string {
	if granularity == "" {
		return ""
	}
	return strings.ToUpper(granularity[:1]) + granularity[1:]
}

func resolveTimezone(input string) (*time.Location, string, error) {
	tz := strings.TrimSpace(input)
	if tz == "" {
		tz = defaultTimezone
	}

	normalized := strings.ToLower(strings.ReplaceAll(tz, " ", ""))
	switch normalized {
	case "asia/kolkata", "asia/calcutta", "ist":
		// Prefer IANA zone when available; fallback keeps service working in slim containers.
		if loc, err := time.LoadLocation("Asia/Kolkata"); err == nil {
			return loc, "Asia/Kolkata", nil
		}
		return time.FixedZone("Asia/Kolkata", 5*3600+30*60), "Asia/Kolkata", nil
	case "utc", "gmt", "z":
		return time.UTC, "UTC", nil
	}

	if loc, err := time.LoadLocation(tz); err == nil {
		return loc, tz, nil
	}

	if loc, canonical, ok := parseFixedOffsetTimezone(tz); ok {
		return loc, canonical, nil
	}

	return nil, "", errors.New("invalid timezone")
}

func parseFixedOffsetTimezone(raw string) (*time.Location, string, bool) {
	re := regexp.MustCompile(`^([+-])(\d{2}):?(\d{2})$`)
	matches := re.FindStringSubmatch(strings.TrimSpace(raw))
	if len(matches) != 4 {
		return nil, "", false
	}

	hours, err := strconv.Atoi(matches[2])
	if err != nil {
		return nil, "", false
	}
	minutes, err := strconv.Atoi(matches[3])
	if err != nil {
		return nil, "", false
	}

	if hours > 14 || minutes > 59 {
		return nil, "", false
	}
	if hours == 14 && minutes != 0 {
		return nil, "", false
	}

	sign := 1
	if matches[1] == "-" {
		sign = -1
	}
	offset := sign * (hours*3600 + minutes*60)
	canonical := fmt.Sprintf("%s%02d:%02d", matches[1], hours, minutes)

	return time.FixedZone(canonical, offset), canonical, true
}
