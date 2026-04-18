package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateProject(c *gin.Context) {

	var project models.Project

	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	createdBy := uint(userID.(float64))

	err := services.CreateProject(&project, createdBy)

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create project", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse("Project created successfully", project))
}

func GetProjects(c *gin.Context) {

	projects, err := services.GetProjects()

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Projects not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Projects fetched successfully", projects))
}

func GetProject(c *gin.Context) {

	id := c.Param("id")

	Project, err := services.GetProject(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Project not found", "Project not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Project fetched successfully", Project))
}

func UpdateProject(c *gin.Context) {

	id := c.Param("id")

	project, err := services.GetProject(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Project not found", "Project not found"))
		return
	}

	// Bind incoming JSON to existing project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	err = services.UpdateProject(&project, updatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update project", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Project updated successfully", project))
}

func DeleteProject(c *gin.Context) {
	id := c.Param("id")

	project, err := services.GetProject(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Project not found", "Project not found"))
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	deletedBy := uint(userID.(float64))

	err = services.DeleteProject(&project, deletedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete project", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("Project deleted successfully", nil))

}
