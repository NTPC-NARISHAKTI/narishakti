package database

import (
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"marketplace/internal/models"
)

var DB *gorm.DB

func Connect() {

	dsn := "host=postgres user=marketplace_user password=narishakti_db_admin dbname=marketplace port=5432 sslmode=disable"

	var db *gorm.DB
	var err error

	// Retry DB connection (important for Docker startup)
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}

		log.Println("⏳ Waiting for database... retrying in 2 seconds")
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("❌ Failed to connect database after retries")
	}

	// Auto migrate
	err = db.AutoMigrate(
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
	if err != nil {
		log.Fatal("❌ Failed to migrate database")
	}

	DB = db

	log.Println("✅ Database connected and migrated successfully")
}
