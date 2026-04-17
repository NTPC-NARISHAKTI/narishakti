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
	auth.POST("/projects", controllers.CreateProject)
	r.GET("/projects", controllers.GetProjects) // public for registration dropdown
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

	// Admin user routes
	admin := auth.Group("/admin")
	admin.Use(middleware.RoleMiddleware("ADMIN"))
	admin.PATCH("/users/:id/approve", controllers.ApproveUser)
	admin.PATCH("/users/:id/reject", controllers.RejectUser)

	// Captain user approval routes
	captain := auth.Group("/captain")
	captain.Use(middleware.RoleMiddleware("CAPTAIN"))
	captain.PATCH("/users/:id/approve", controllers.CaptainApproveUser)
	captain.PATCH("/users/:id/reject", controllers.CaptainRejectUser)

	// Inventory routes
	auth.POST("/inventories", controllers.CreateInventory)
	auth.GET("/inventories", controllers.GetInventories)
	auth.GET("/inventories/:id", controllers.GetInventory)
	auth.PUT("/inventories/:id", controllers.UpdateInventory)
	auth.DELETE("/inventories/:id", controllers.DeleteInventory)

	// Post routes
	auth.POST("/posts", middleware.RoleMiddleware("ADMIN", "CAPTAIN"), controllers.CreatePost)
	auth.GET("/posts", controllers.GetPosts)
	auth.GET("/posts/:id", controllers.GetPost)
	auth.PUT("/posts/:id", controllers.UpdatePost)
	auth.DELETE("/posts/:id", controllers.DeletePost)
	auth.PATCH("/posts/:id/toggle-active", controllers.TogglePostActive)

	// Order routes
	auth.POST("/orders", controllers.CreateOrder)
	auth.GET("/orders", controllers.GetOrders)
	auth.GET("/orders/:id", controllers.GetOrder)
	auth.PUT("/orders/:id", controllers.UpdateOrder)
	auth.DELETE("/orders/:id", controllers.DeleteOrder)

	// Log routes
	auth.POST("/logs", controllers.CreateLog)
	auth.GET("/logs", controllers.GetLogs)
	auth.GET("/logs/:id", controllers.GetLog)
	auth.PUT("/logs/:id", controllers.UpdateLog)
	auth.DELETE("/logs/:id", controllers.DeleteLog)

	// Auth routes Public
	r.POST("/register", controllers.Register)
	r.POST("/login", controllers.Login)
	auth.GET("/me", controllers.GetCurrentUser)
}
