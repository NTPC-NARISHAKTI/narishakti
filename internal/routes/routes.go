package routes

import (
	controllers "marketplace/internal/controller"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Project routes
	r.POST("/projects", controllers.CreateProject)
	r.GET("/projects", controllers.GetProjects)
	r.GET("/projects/:id", controllers.GetProject)
	r.PUT("/projects/:id", controllers.UpdateProject)
	r.DELETE("/projects/:id", controllers.DeleteProject)

	// Product routes
	r.POST("/products", controllers.CreateProduct)
	r.GET("/products", controllers.GetProducts)
	r.GET("/products/:id", controllers.GetProduct)
	r.PUT("/products/:id", controllers.UpdateProject)
	r.DELETE("/products/:id", controllers.DeleteProject)

	// User CRUD routes
	r.POST("/users", controllers.CreateUser)
	r.GET("/users", controllers.GetUsers)
	r.GET("/users/:id", controllers.GetUser)
	r.PUT("/users/:id", controllers.UpdateUser)
	r.DELETE("/users/:id", controllers.DeleteUser)

	// Auth routes (register/login)
	r.POST("/register", controllers.Register)
	r.POST("/login", controllers.Login)
}
