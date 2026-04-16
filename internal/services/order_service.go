package services

import (
	"errors"
	"marketplace/internal/database"
	"marketplace/internal/models"
	"marketplace/internal/repositories"

	"gorm.io/gorm"
)

func CreateOrder(order *models.Order) error {
	// Address is required
	if order.Address == "" {
		return errors.New("address is required")
	}

	// Validate order quantity against remaining quantity (TotalQty - confirmed orders)
	var post models.Post
	if err := database.DB.First(&post, order.PostID).Error; err != nil {
		return errors.New("post not found")
	}

	// Calculate remaining quantity
	var confirmedOrdersQty int64
	database.DB.Model(&models.Order{}).
		Where("post_id = ? AND order_status = ?", order.PostID, "CONFIRMED").
		Select("COALESCE(SUM(order_quantity), 0)").
		Scan(&confirmedOrdersQty)

	remainingQty := post.TotalQty - int(confirmedOrdersQty)
	if remainingQty < 0 {
		remainingQty = 0
	}

	if order.OrderQuantity > remainingQty {
		return errors.New("order quantity exceeds available remaining quantity in post")
	}

	err := repositories.CreateOrder(order)
	if err != nil {
		return err
	}

	// Log the order creation
	LogActivity("CREATED", "ORDER", order.ID, order.UserID, "User created an order")

	return nil
}

func GetOrders() ([]models.Order, error) {
	return repositories.GetOrders()
}

func GetOrder(id string) (models.Order, error) {
	return repositories.GetOrderByID(id)
}

func UpdateOrder(order *models.Order) error {
	// Get the existing order to check status change
	var existingOrder models.Order
	if err := database.DB.First(&existingOrder, order.ID).Error; err != nil {
		return err
	}

	// Validate order quantity against remaining quantity (TotalQty - confirmed orders excluding this order)
	var post models.Post
	if err := database.DB.First(&post, order.PostID).Error; err != nil {
		return errors.New("post not found")
	}

	// Calculate remaining quantity excluding this order's quantity if it's confirmed
	var confirmedOrdersQty int64
	query := database.DB.Model(&models.Order{}).
		Where("post_id = ? AND order_status = ? AND id != ?", order.PostID, "CONFIRMED", order.ID).
		Select("COALESCE(SUM(order_quantity), 0)")
	query.Scan(&confirmedOrdersQty)

	remainingQty := post.TotalQty - int(confirmedOrdersQty)
	if remainingQty < 0 {
		remainingQty = 0
	}

	if order.OrderQuantity > remainingQty {
		return errors.New("order quantity exceeds available remaining quantity in post")
	}

	// Check if status is being changed to CONFIRMED or COMPLETED (from a non-final state)
	if (existingOrder.OrderStatus == "PENDING" || existingOrder.OrderStatus == "CANCELLED") &&
		(order.OrderStatus == "CONFIRMED" || order.OrderStatus == "COMPLETED") {
		// Reduce inventory
		if err := reduceInventory(order.PostID, order.OrderQuantity); err != nil {
			return err
		}
		// Increment TotalOrders in the post (for display purposes)
		database.DB.Model(&models.Post{}).
			Where("id = ?", order.PostID).
			Update("total_orders", gorm.Expr("total_orders + 1"))
		// Log the order confirmation
		LogActivity("CONFIRMED", "ORDER", order.ID, order.UserID, "Order confirmed/completed and inventory was reduced")
	}

	err := repositories.UpdateOrder(order)
	if err != nil {
		return err
	}

	return nil
}

func reduceInventory(postID uint, quantity int) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Find the post to get the product ID
		var post models.Post
		if err := tx.First(&post, postID).Error; err != nil {
			return err
		}

		// Reduce inventory quantity
		result := tx.Model(&models.Inventory{}).
			Where("product_id = ?", post.ProductID).
			Update("quantity", gorm.Expr("quantity - ?", quantity))

		if result.Error != nil {
			return result.Error
		}

		// Check if update affected any rows
		if result.RowsAffected == 0 {
			return errors.New("inventory not found for product")
		}

		return nil
	})
}

func DeleteOrder(order *models.Order) error {
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var post models.Post
		if err := tx.First(&post, order.PostID).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Inventory{}).
			Where("product_id = ?", post.ProductID).
			Update("quantity", gorm.Expr("quantity + ?", order.OrderQuantity)).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Post{}).
			Where("id = ?", order.PostID).
			Update("total_orders", gorm.Expr("total_orders - 1")).Error; err != nil {
			return err
		}

		if err := tx.Delete(order).Error; err != nil {
			return err
		}

		return nil
	})

	return err
}
