package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateInventory(inventory *models.Inventory) error {
	return repositories.CreateInventory(inventory)
}

func GetInventories() ([]models.Inventory, error) {
	return repositories.GetInventories()
}

func GetInventory(id string) (models.Inventory, error) {
	return repositories.GetInventoryByID(id)
}

func UpdateInventory(inventory *models.Inventory) error {
	return repositories.UpdateInventory(inventory)
}

func DeleteInventory(inventory *models.Inventory) error {
	return repositories.DeleteInventory(inventory)
}
