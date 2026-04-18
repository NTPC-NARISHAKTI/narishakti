package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreateOrder(order *models.Order) error {
	return database.DB.Create(order).Error
}

func GetOrders() ([]models.Order, error) {
	var orders []models.Order
	err := database.DB.Preload("Post.Product.Project").Preload("Post.Product").Preload("Post").Preload("User.Project").Preload("User").Find(&orders).Error
	return orders, err
}

func GetOrderByID(id string) (models.Order, error) {
	var order models.Order
	err := database.DB.Preload("Post.Product.Project").Preload("Post.Product").Preload("Post").Preload("User.Project").Preload("User").First(&order, id).Error
	return order, err
}

func UpdateOrder(order *models.Order) error {
	return database.DB.Save(order).Error
}

func DeleteOrder(order *models.Order) error {
	return database.DB.Delete(order).Error
}
