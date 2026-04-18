package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"

	"gorm.io/gorm"
)

func CreateOrder(order *models.Order) error {
	return database.DB.Create(order).Error
}

func GetOrders() ([]models.Order, error) {
	var orders []models.Order
	err := preloadOrderRelations(database.DB).Find(&orders).Error
	return orders, err
}

func GetOrdersByProjectID(projectID uint) ([]models.Order, error) {
	var orders []models.Order
	err := preloadOrderRelations(database.DB).
		Joins("JOIN posts ON posts.id = orders.post_id").
		Joins("JOIN products ON products.id = posts.product_id").
		Where("products.project_id = ?", projectID).
		Find(&orders).Error
	return orders, err
}

func GetOrderByID(id string) (models.Order, error) {
	var order models.Order
	err := preloadOrderRelations(database.DB).First(&order, id).Error
	return order, err
}

func preloadOrderRelations(db *gorm.DB) *gorm.DB {
	return db.Preload("Post.Product.Project").
		Preload("Post.Product").
		Preload("Post").
		Preload("User.Project").
		Preload("User")
}

func UpdateOrder(order *models.Order) error {
	return database.DB.Save(order).Error
}

func DeleteOrder(order *models.Order) error {
	return database.DB.Delete(order).Error
}
