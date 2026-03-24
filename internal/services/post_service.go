package services

import (
	"errors"

	"marketplace/internal/database"
	"marketplace/internal/models"
	"marketplace/internal/repositories"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func CreatePost(post *models.Post, userRole string) error {
	if userRole != "ADMIN" {
		return errors.New("unauthorized: only admins can create posts")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
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
}

func GetPosts() ([]models.Post, error) {
	return repositories.GetPosts()
}

func GetPost(id string) (models.Post, error) {
	return repositories.GetPostByID(id)
}

func UpdatePost(post *models.Post) error {
	return repositories.UpdatePost(post)
}

func DeletePost(post *models.Post) error {
	return repositories.DeletePost(post)
}
