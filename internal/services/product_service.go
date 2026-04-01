package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateProduct(product *models.Product, createdBy uint) error {
	err := repositories.CreateProduct(product)
	if err != nil {
		return err
	}

	// Log the product creation
	LogActivity("CREATED", "PRODUCT", product.ID, createdBy, "Product was created")

	return nil
}

func GetProducts() ([]models.Product, error) {
	return repositories.GetProducts()
}

func GetProduct(id string) (models.Product, error) {
	return repositories.GetProductByID(id)
}

func UpdateProduct(product *models.Product) error {
	return repositories.UpdateProduct(product)
}

func DeleteProduct(product *models.Product) error {
	return repositories.DeleteProduct(product)
}
