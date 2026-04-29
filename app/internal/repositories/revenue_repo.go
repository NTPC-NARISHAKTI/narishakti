package repositories

import (
	"marketplace/internal/database"
	"time"
)

type RevenueSummaryRow struct {
	TotalRevenue  float64
	TotalQuantity int64
	TotalOrders   int64
	TotalProducts int64
}

type RevenueTimeSeriesRow struct {
	BucketStart   time.Time
	TotalRevenue  float64
	TotalQuantity int64
	TotalOrders   int64
}

type RevenueByProductRow struct {
	ProductID     uint
	ProductName   string
	TotalRevenue  float64
	TotalQuantity int64
	TotalOrders   int64
}

func GetRevenueSummary(projectID uint, fromUTC, toUTC time.Time) (RevenueSummaryRow, error) {
	var row RevenueSummaryRow

	query := `
		SELECT
			COALESCE(SUM(
				CASE
					WHEN o.gross_amount > 0 THEN o.gross_amount
					WHEN o.total_price > 0 THEN o.total_price
					ELSE po.price * o.order_quantity
				END
			), 0) AS total_revenue,
			COALESCE(SUM(o.order_quantity), 0) AS total_quantity,
			COUNT(o.id) AS total_orders,
			COUNT(DISTINCT p.id) AS total_products
		FROM orders o
		JOIN posts po ON po.id = o.post_id
		JOIN products p ON p.id = po.product_id
		WHERE p.project_id = ?
			AND UPPER(o.order_status) = 'COMPLETED'
			AND COALESCE(o.order_confirmed_at, o.updated_at) >= ?
			AND COALESCE(o.order_confirmed_at, o.updated_at) < ?
	`

	err := database.DB.Raw(query, projectID, fromUTC, toUTC).Scan(&row).Error
	return row, err
}

func GetRevenueTimeSeries(projectID uint, fromUTC, toUTC time.Time, granularity, tz string) ([]RevenueTimeSeriesRow, error) {
	var rows []RevenueTimeSeriesRow

	query := `
		SELECT
			date_trunc(?, timezone(?, COALESCE(o.order_confirmed_at, o.updated_at))) AS bucket_start,
			COALESCE(SUM(
				CASE
					WHEN o.gross_amount > 0 THEN o.gross_amount
					WHEN o.total_price > 0 THEN o.total_price
					ELSE po.price * o.order_quantity
				END
			), 0) AS total_revenue,
			COALESCE(SUM(o.order_quantity), 0) AS total_quantity,
			COUNT(o.id) AS total_orders
		FROM orders o
		JOIN posts po ON po.id = o.post_id
		JOIN products p ON p.id = po.product_id
		WHERE p.project_id = ?
			AND UPPER(o.order_status) = 'COMPLETED'
			AND COALESCE(o.order_confirmed_at, o.updated_at) >= ?
			AND COALESCE(o.order_confirmed_at, o.updated_at) < ?
		GROUP BY 1
		ORDER BY 1
	`

	err := database.DB.Raw(query, granularity, tz, projectID, fromUTC, toUTC).Scan(&rows).Error
	return rows, err
}

func GetRevenueByProduct(projectID uint, fromUTC, toUTC time.Time, limit int) ([]RevenueByProductRow, error) {
	var rows []RevenueByProductRow

	query := `
		SELECT
			p.id AS product_id,
			p.name AS product_name,
			COALESCE(SUM(
				CASE
					WHEN o.gross_amount > 0 THEN o.gross_amount
					WHEN o.total_price > 0 THEN o.total_price
					ELSE po.price * o.order_quantity
				END
			), 0) AS total_revenue,
			COALESCE(SUM(o.order_quantity), 0) AS total_quantity,
			COUNT(o.id) AS total_orders
		FROM orders o
		JOIN posts po ON po.id = o.post_id
		JOIN products p ON p.id = po.product_id
		WHERE p.project_id = ?
			AND UPPER(o.order_status) = 'COMPLETED'
			AND COALESCE(o.order_confirmed_at, o.updated_at) >= ?
			AND COALESCE(o.order_confirmed_at, o.updated_at) < ?
		GROUP BY p.id, p.name
		ORDER BY total_revenue DESC
		LIMIT ?
	`

	err := database.DB.Raw(query, projectID, fromUTC, toUTC, limit).Scan(&rows).Error
	return rows, err
}
