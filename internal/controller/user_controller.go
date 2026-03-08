package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"

	"github.com/gin-gonic/gin"
)

func CreateUser(c *gin.Context) {

	var User models.User

	if err := c.ShouldBindJSON(&User); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := services.CreateUser(&User)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, User)
}

func GetUsers(c *gin.Context) {

	Users, err := services.GetUsers()

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, Users)
}

func GetUser(c *gin.Context) {

	id := c.Param("id")

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, User)
}

func UpdateUser(c *gin.Context) {

	id := c.Param("id")

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Bind incoming JSON to existing User
	if err := c.ShouldBindJSON(&User); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = services.UpdateUser(&User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, User)
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	err = services.DeleteUser(&User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, User)

}
