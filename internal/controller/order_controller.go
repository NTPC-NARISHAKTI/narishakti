package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateOrder(c *gin.Context) {
	var order models.Order

	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err := services.CreateOrder(&order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create order", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Order created successfully", order))
}

func GetOrders(c *gin.Context) {
	orders, err := services.GetOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch orders", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Orders fetched successfully", orders))
}

func GetOrder(c *gin.Context) {
	id := c.Param("id")

	order, err := services.GetOrder(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Order not found", "Order not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Order fetched successfully", order))
}

func UpdateOrder(c *gin.Context) {
	id := c.Param("id")

	order, err := services.GetOrder(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Order not found", "Order not found"))
		return
	}

	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err = services.UpdateOrder(&order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update order", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Order updated successfully", order))
}

func DeleteOrder(c *gin.Context) {
	id := c.Param("id")

	order, err := services.GetOrder(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Order not found", "Order not found"))
		return
	}

	err = services.DeleteOrder(&order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete order", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("Order deleted successfully", nil))
}
