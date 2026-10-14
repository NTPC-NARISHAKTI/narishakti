package database

import (
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"marketplace/internal/models"
)

var DB *gorm.DB

var (
	blacklistedTokens   = make(map[string]bool)
	blacklistedTokensMu sync.RWMutex
)

// BlacklistToken marks a JWT as revoked (e.g. on logout / password change)
// so AuthMiddleware rejects it even though it hasn't expired yet.
func BlacklistToken(token string) {
	blacklistedTokensMu.Lock()
	defer blacklistedTokensMu.Unlock()
	blacklistedTokens[token] = true
}

// IsTokenBlacklisted reports whether a JWT has been revoked.
func IsTokenBlacklisted(token string) bool {
	blacklistedTokensMu.RLock()
	defer blacklistedTokensMu.RUnlock()
	return blacklistedTokens[token]
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func Connect() {

	// Reads from environment when available; falls back to the previous
	// hardcoded local/docker-compose defaults so nothing breaks if the env
	// vars aren't set. In any real deployment these MUST be set via env
	// vars / secrets rather than relying on the fallback values below.
	host := getenv("DB_HOST", "postgres")
	user := getenv("DB_USER", "marketplace_user")
	password := getenv("DB_PASSWORD", "narishakti_db_admin")
	dbname := getenv("DB_NAME", "marketplace")
	port := getenv("DB_PORT", "5432")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbname, port)

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
