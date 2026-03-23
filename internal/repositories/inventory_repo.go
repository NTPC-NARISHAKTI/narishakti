package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreateInventory(inventory *models.Inventory) error {
	return database.DB.Create(inventory).Error
}

func GetInventories() ([]models.Inventory, error) {
	var inventories []models.Inventory
	err := database.DB.Preload("Product.Project").Preload("Product").Find(&inventories).Error
    
	return inventories, err
}

func GetInventoryByID(id string) (models.Inventory, error) {
	var inventory models.Inventory
	err := database.DB.Preload("Product.Project").Preload("Product").First(&inventory, id).Error
	return inventory, err
}

func UpdateInventory(inventory *models.Inventory) error {
	return database.DB.Save(inventory).Error
}

func DeleteInventory(inventory *models.Inventory) error {
	return database.DB.Delete(inventory).Error
}
