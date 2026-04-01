package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateLog(c *gin.Context) {
	var log models.Log

	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err := services.CreateLog(&log)

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create log", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse("Log created successfully", log))
}

func GetLogs(c *gin.Context) {
	logs, err := services.GetLogs()

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Logs not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Logs fetched successfully", logs))
}

func GetLog(c *gin.Context) {
	id := c.Param("id")

	log, err := services.GetLog(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Log not found", "Log not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Log fetched successfully", log))
}

func UpdateLog(c *gin.Context) {
	id := c.Param("id")

	log, err := services.GetLog(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Log not found", "Log not found"))
		return
	}

	// Bind incoming JSON to existing log
	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err = services.UpdateLog(&log)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update log", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Log updated successfully", log))
}

func DeleteLog(c *gin.Context) {
	id := c.Param("id")

	log, err := services.GetLog(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Log not found", "Log not found"))
		return
	}

	err = services.DeleteLog(&log)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete log", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Log deleted successfully", nil))
}
