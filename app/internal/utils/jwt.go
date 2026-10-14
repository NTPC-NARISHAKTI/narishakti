package utils

import (
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JwtKey signs and verifies all JWTs. It MUST be set via the JWT_SECRET
// environment variable in any real deployment - anyone who can read this
// source (e.g. a public repo) can forge tokens for any user/role if the
// fallback below is what's actually running in production.
var JwtKey = loadJwtKey()

func loadJwtKey() []byte {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return []byte(secret)
	}
	log.Println("⚠️  JWT_SECRET not set - falling back to an insecure default signing key. Set JWT_SECRET before deploying.")
	return []byte("your-secret-key")
}

func GenerateJWT(userID uint, email, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"role":    role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(), // 1 day expiration
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtKey)
}
