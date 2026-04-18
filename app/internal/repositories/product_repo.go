package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreateProduct(product *models.Product) error {
	return database.DB.Create(product).Error
}

func GetProducts() ([]models.Product, error) {

	var products []models.Product

	err := database.DB.Preload("Project").Find(&products).Error

	return products, err
}

func GetProductByID(id string) (models.Product, error) {

	var product models.Product

	err := database.DB.Preload("Project").First(&product, id).Error

	return product, err
}

func UpdateProduct(product *models.Product) error {
	return database.DB.Save(product).Error
}

func DeleteProduct(product *models.Product) error {
	return database.DB.Delete(product).Error
}
