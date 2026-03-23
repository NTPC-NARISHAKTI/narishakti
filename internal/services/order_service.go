package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateOrder(order *models.Order) error {
	return repositories.CreateOrder(order)
}

func GetOrders() ([]models.Order, error) {
	return repositories.GetOrders()
}

func GetOrder(id string) (models.Order, error) {
	return repositories.GetOrderByID(id)
}

func UpdateOrder(order *models.Order) error {
	return repositories.UpdateOrder(order)
}

func DeleteOrder(order *models.Order) error {
	return repositories.DeleteOrder(order)
}
