package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateProduct(c *gin.Context) {

	var product models.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	createdBy := uint(userID.(float64))

	err := services.CreateProduct(&product, createdBy)

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create product", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse("Product created successfully", product))
}

func GetProducts(c *gin.Context) {

	products, err := services.GetProducts()

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to get products", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Products retrieved successfully", products))
}

func GetProduct(c *gin.Context) {

	id := c.Param("id")

	product, err := services.GetProduct(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Product not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Product retrieved successfully", product))
}

func UpdateProduct(c *gin.Context) {

	id := c.Param("id")

	product, err := services.GetProduct(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Bind incoming JSON to existing project
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	err = services.UpdateProduct(&product, updatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update product", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Product updated successfully", product))
}

func DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	product, err := services.GetProduct(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	deletedBy := uint(userID.(float64))

	err = services.DeleteProduct(&product, deletedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Product deleted successfully", nil))

}
