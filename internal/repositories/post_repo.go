package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreatePost(post *models.Post) error {
	return database.DB.Create(post).Error
}

func GetPosts() ([]models.Post, error) {
	var posts []models.Post
	err := database.DB.Preload("Product.Project").Preload("Product").Find(&posts).Error
	return posts, err
}

func GetPostByID(id string) (models.Post, error) {
	var post models.Post
	err := database.DB.Preload("Product.Project").Preload("Product").First(&post, id).Error
	return post, err
}

func UpdatePost(post *models.Post) error {
	return database.DB.Save(post).Error
}

func DeletePost(post *models.Post) error {
	return database.DB.Delete(post).Error
}
