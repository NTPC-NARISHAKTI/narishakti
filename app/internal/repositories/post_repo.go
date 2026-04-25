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

func GetPostsByProjectID(projectID uint) ([]models.Post, error) {
	var posts []models.Post
	err := database.DB.Preload("Product.Project").Preload("Product").
		Joins("JOIN products ON products.id = posts.product_id").
		Where("products.project_id = ?", projectID).
		Find(&posts).Error
	return posts, err
}

// GetPostsPaginated returns posts with pagination support
// limit: number of records to return (0 means no limit)
// offset: number of records to skip
func GetPostsPaginated(limit, offset int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	// Get total count
	if err := database.DB.Model(&models.Post{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := database.DB.Preload("Product.Project").Preload("Product").
		Order("created_at DESC")

	// Apply pagination if limit is specified
	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	return posts, total, nil
}

func GetPostsPaginatedByProjectID(limit, offset int, projectID uint) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	countQuery := database.DB.Model(&models.Post{}).
		Joins("JOIN products ON products.id = posts.product_id").
		Where("products.project_id = ?", projectID)

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := database.DB.Preload("Product.Project").Preload("Product").
		Joins("JOIN products ON products.id = posts.product_id").
		Where("products.project_id = ?", projectID).
		Order("posts.created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	return posts, total, nil
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
