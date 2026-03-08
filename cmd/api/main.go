package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"marketplace/internal/database"

	"marketplace/internal/routes"
)

func main() {

	database.Connect()

	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	log.Println("Server running on port 8080")

	routes.SetupRoutes(router)
	router.Run(":8080")
}
