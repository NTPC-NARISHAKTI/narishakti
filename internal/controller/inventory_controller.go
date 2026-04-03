package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateInventory(c *gin.Context) {
	var inventory models.Inventory

	if err := c.ShouldBindJSON(&inventory); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	createdBy := uint(userID.(float64))

	err := services.CreateInventory(&inventory, createdBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create inventory", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Inventory created successfully", inventory))
}

func GetInventories(c *gin.Context) {
	inventories, err := services.GetInventories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch inventories", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Inventories fetched successfully", inventories))
}

func GetInventory(c *gin.Context) {
	id := c.Param("id")

	inventory, err := services.GetInventory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Inventory not found", "Inventory not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Inventory fetched successfully", inventory))
}

func UpdateInventory(c *gin.Context) {
	id := c.Param("id")

	inventory, err := services.GetInventory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Inventory not found", "Inventory not found"))
		return
	}

	if err := c.ShouldBindJSON(&inventory); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	err = services.UpdateInventory(&inventory, updatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update inventory", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Inventory updated successfully", inventory))
}

func DeleteInventory(c *gin.Context) {
	id := c.Param("id")

	inventory, err := services.GetInventory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Inventory not found", "Inventory not found"))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	deletedBy := uint(userID.(float64))

	err = services.DeleteInventory(&inventory, deletedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete inventory", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("Inventory deleted successfully", nil))
}
