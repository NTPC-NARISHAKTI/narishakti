package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "Missing Authorization header"))
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			tokenString = authHeader
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return utils.JwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "Invalid token"))
			c.Abort()
			return
		}

		fmt.Printf("JWT Claims: %v\n", claims)

		userID, ok := claims["user_id"]
		if !ok {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User ID not found in token"))
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		c.Set("role", claims["role"])
		c.Next()
	}
}
