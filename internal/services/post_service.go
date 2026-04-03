package services

import (
	"errors"
	"strings"

	"marketplace/internal/database"
	"marketplace/internal/models"
	"marketplace/internal/repositories"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func CreatePost(post *models.Post, userRole string, createdBy uint) error {
	userRoleUpper := strings.ToUpper(userRole)
	if userRoleUpper != "ADMIN" && userRoleUpper != "CAPTAIN" {
		return errors.New("unauthorized: only admins and captains can create posts")
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Create Post
		if err := tx.Create(post).Error; err != nil {
			return err
		}

		// 2. Manage Inventory
		var inv models.Inventory
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("product_id = ?", post.ProductID).First(&inv).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Record doesn't exist, create it
				inv = models.Inventory{
					ProductID: post.ProductID,
					Quantity:  post.TotalQty,
				}
				return tx.Create(&inv).Error
			}
			return err
		}

		// Record exists, increment quantity atomically
		return tx.Model(&inv).Update("quantity", gorm.Expr("quantity + ?", post.TotalQty)).Error
	})

	if err != nil {
		return err
	}

	// Log the post creation
	LogActivity("CREATED", "POST", post.ID, createdBy, "Post was created and inventory was updated")

	return nil
}

func GetPosts() ([]models.Post, error) {
	return repositories.GetPosts()
}

// GetPostsWithRemainingQty returns posts with calculated remaining quantity
func GetPostsWithRemainingQty() ([]map[string]interface{}, error) {
	posts, err := repositories.GetPosts()
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}

	for _, post := range posts {
		// Calculate remaining quantity (TotalQty - sum of confirmed order quantities)
		var confirmedOrdersQty int64
		database.DB.Model(&models.Order{}).
			Where("post_id = ? AND order_status = ?", post.ID, "CONFIRMED").
			Select("COALESCE(SUM(order_quantity), 0)").
			Scan(&confirmedOrdersQty)

		remainingQty := post.TotalQty - int(confirmedOrdersQty)
		if remainingQty < 0 {
			remainingQty = 0 // Prevent negative values
		}

		postData := map[string]interface{}{
			"ID":           post.ID,
			"CreatedAt":    post.CreatedAt,
			"UpdatedAt":    post.UpdatedAt,
			"ProductID":    post.ProductID,
			"Product":      post.Product,
			"ProductImg":   post.ProductImg,
			"Price":        post.Price,
			"TotalQty":     post.TotalQty,
			"RemainingQty": remainingQty,
			"TotalOrders":  post.TotalOrders,
		}
		result = append(result, postData)
	}

	return result, nil
}

func GetPost(id string) (models.Post, error) {
	return repositories.GetPostByID(id)
}

func UpdatePost(post *models.Post, updatedBy uint) error {
	err := repositories.UpdatePost(post)
	if err != nil {
		return err
	}

	LogActivity("UPDATED", "POST", post.ID, updatedBy, "Post details updated")
	return nil
}

func DeletePost(post *models.Post, deletedBy uint) error {
	err := repositories.DeletePost(post)
	if err != nil {
		return err
	}

	LogActivity("DELETED", "POST", post.ID, deletedBy, "Post was deleted")
	return nil
}
