package database

import (
	"log"

	"gorm.io/driver/postgres"

	"gorm.io/gorm"

	"marketplace/internal/models"
)

var DB *gorm.DB

func Connect() {

	dsn := "host=localhost user=marketplace_user password=narishakti_db_admin dbname=marketplace port=5432 sslmode=disable"

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database")
	}

	db.AutoMigrate(
		&models.Project{},
		&models.User{},
		&models.Product{},
		&models.Inventory{},
		&models.Post{},
		&models.Order{},
		&models.Log{},
		&models.LoginInput{},
		&models.RegisterInput{},
	)

	DB = db

	log.Println("Database connected and migrated successfully")
}
