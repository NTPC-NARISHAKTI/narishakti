package controllers

import (
	"fmt"
	"net/http"
	"strings"

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
	var orders []models.Order
	var err error

	captainProjectID, restricted := getCaptainProjectID(c)
	if restricted {
		orders, err = services.GetOrdersByProjectID(captainProjectID)
	} else {
		orders, err = services.GetOrders()
	}

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

	if !canAccessOrder(c, order) {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only access orders in your project"))
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

	if !canAccessOrder(c, order) {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only update orders in your project"))
		return
	}

	existingOrder := order

	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	if isCaptain(c) {
		order.ID = existingOrder.ID
		order.PostID = existingOrder.PostID
		order.UserID = existingOrder.UserID
		order.OrderQuantity = existingOrder.OrderQuantity
		order.TotalPrice = existingOrder.TotalPrice
		order.Address = existingOrder.Address
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

	if !canAccessOrder(c, order) {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only delete orders in your project"))
		return
	}

	err = services.DeleteOrder(&order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete order", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("Order deleted successfully", nil))
}

func isCaptain(c *gin.Context) bool {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	return strings.EqualFold(roleStr, "CAPTAIN")
}

func getCaptainProjectID(c *gin.Context) (uint, bool) {
	if !isCaptain(c) {
		return 0, false
	}

	userID, exists := c.Get("user_id")
	if !exists {
		return 0, true
	}

	captain, err := services.GetUser(fmt.Sprintf("%v", userID))
	if err != nil || captain.ProjectID == nil {
		return 0, true
	}

	return *captain.ProjectID, true
}

func canAccessOrder(c *gin.Context, order models.Order) bool {
	captainProjectID, restricted := getCaptainProjectID(c)
	if !restricted {
		return true
	}

	return captainProjectID != 0 && orderProjectID(order) == captainProjectID
}

func orderProjectID(order models.Order) uint {
	if order.Post.Product.ProjectID != 0 {
		return order.Post.Product.ProjectID
	}
	return 0
}
