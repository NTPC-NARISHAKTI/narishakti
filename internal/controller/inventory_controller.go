package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"

	"github.com/gin-gonic/gin"
)

func CreateInventory(c *gin.Context) {
	var inventory models.Inventory

	if err := c.ShouldBindJSON(&inventory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := services.CreateInventory(&inventory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

func GetInventories(c *gin.Context) {
	inventories, err := services.GetInventories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventories)
}

func GetInventory(c *gin.Context) {
	id := c.Param("id")

	inventory, err := services.GetInventory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

func UpdateInventory(c *gin.Context) {
	id := c.Param("id")

	inventory, err := services.GetInventory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	if err := c.ShouldBindJSON(&inventory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = services.UpdateInventory(&inventory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inventory)
}

func DeleteInventory(c *gin.Context) {
	id := c.Param("id")

	inventory, err := services.GetInventory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	err = services.DeleteInventory(&inventory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, inventory)
}
