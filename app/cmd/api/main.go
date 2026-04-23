package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"marketplace/internal/database"

	// "github.com/prometheus/client_golang/prometheus/promhttp"

	"marketplace/internal/routes"
)

func main() {
	database.Connect()

	router := gin.Default()
	router.SetTrustedProxies(nil)
	// CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, PATCH, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Serve frontend files
	router.Static("/css", "./css")
	router.Static("/js", "./js")
	router.Static("/uploads", "./uploads")

	// Serve HTML pages
	router.GET("/", func(c *gin.Context) {
		c.File("./index.html")
	})
	router.GET("/index", func(c *gin.Context) {
		c.File("./index.html")
	})

	router.GET("/captain", func(c *gin.Context) {
		c.File("./captain.html")
	})

	router.GET("/captain.html", func(c *gin.Context) {
		c.File("./captain.html")
	})

	router.GET("/director", func(c *gin.Context) {
		c.File("./director.html")
	})

	router.GET("/director.html", func(c *gin.Context) {
		c.File("./director.html")
	})

	router.GET("/user", func(c *gin.Context) {
		c.File("./user.html")
	})

	router.GET("/user.html", func(c *gin.Context) {
		c.File("./user.html")
	})
	// router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	// API
	routes.SetupRoutes(router)

	log.Println("Server running on port 8080")
	router.Run(":8080")
}
