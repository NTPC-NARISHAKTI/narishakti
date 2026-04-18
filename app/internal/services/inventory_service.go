package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateInventory(inventory *models.Inventory, createdBy uint) error {
	err := repositories.CreateInventory(inventory)
	if err != nil {
		return err
	}

	// Log the inventory creation
	LogActivity("CREATED", "INVENTORY", inventory.ID, createdBy, "Inventory was created")

	return nil
}

func GetInventories() ([]models.Inventory, error) {
	return repositories.GetInventories()
}

func GetInventory(id string) (models.Inventory, error) {
	return repositories.GetInventoryByID(id)
}

func UpdateInventory(inventory *models.Inventory, updatedBy uint) error {
	err := repositories.UpdateInventory(inventory)
	if err != nil {
		return err
	}

	// Log the inventory update
	LogActivity("UPDATED", "INVENTORY", inventory.ID, updatedBy, "Inventory quantity was updated")

	return nil
}

func DeleteInventory(inventory *models.Inventory, deletedBy uint) error {
	err := repositories.DeleteInventory(inventory)
	if err != nil {
		return err
	}

	LogActivity("DELETED", "INVENTORY", inventory.ID, deletedBy, "Inventory was deleted")
	return nil
}
