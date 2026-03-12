package routes

import (
	controllers "marketplace/internal/controller"

	"marketplace/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	auth := r.Group("/")
	auth.Use(middleware.AuthMiddleware())
	// Routes Private
	// Project routes
	r.POST("/projects", controllers.CreateProject)
	auth.GET("/projects", controllers.GetProjects)
	auth.GET("/projects/:id", controllers.GetProject)
	auth.PUT("/projects/:id", controllers.UpdateProject)
	auth.DELETE("/projects/:id", controllers.DeleteProject)

	// Product routes
	auth.POST("/products", controllers.CreateProduct)
	auth.GET("/products", controllers.GetProducts)
	auth.GET("/products/:id", controllers.GetProduct)
	auth.PUT("/products/:id", controllers.UpdateProduct)
	auth.DELETE("/products/:id", controllers.DeleteProduct)

	// User CRUD routes
	auth.POST("/users", controllers.CreateUser)
	auth.GET("/users", controllers.GetUsers)
	auth.GET("/users/:id", controllers.GetUser)
	auth.PUT("/users/:id", controllers.UpdateUser)
	auth.DELETE("/users/:id", controllers.DeleteUser)

	// Auth routes Public
	r.POST("/register", controllers.Register)
	r.POST("/login", controllers.Login)
}
