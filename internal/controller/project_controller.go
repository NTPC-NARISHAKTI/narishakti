package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"

	"github.com/gin-gonic/gin"
)

func CreateProject(c *gin.Context) {

	var project models.Project

	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := services.CreateProject(&project)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, project)
}

func GetProjects(c *gin.Context) {

	projects, err := services.GetProjects()

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, projects)
}

func GetProject(c *gin.Context) {

	id := c.Param("id")

	Project, err := services.GetProject(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, Project)
}

func UpdateProject(c *gin.Context) {

	id := c.Param("id")

	project, err := services.GetProject(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Bind incoming JSON to existing project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = services.UpdateProject(&project)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	id := c.Param("id")

	project, err := services.GetProject(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	err = services.DeleteProject(&project)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, project)

}
