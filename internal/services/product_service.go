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

func UpdateProduct(product *models.Product, updatedBy uint) error {
	err := repositories.UpdateProduct(product)
	if err != nil {
		return err
	}

	LogActivity("UPDATED", "PRODUCT", product.ID, updatedBy, "Product details updated")
	return nil
}

func DeleteProduct(product *models.Product, deletedBy uint) error {
	err := repositories.DeleteProduct(product)
	if err != nil {
		return err
	}

	LogActivity("DELETED", "PRODUCT", product.ID, deletedBy, "Product was deleted")
	return nil
}
