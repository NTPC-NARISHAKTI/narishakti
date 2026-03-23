package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreatePost(post *models.Post) error {
	return repositories.CreatePost(post)
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
