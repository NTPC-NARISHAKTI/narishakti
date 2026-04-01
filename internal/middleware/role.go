package middleware

import (
	"net/http"
	"strings"

	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func RoleMiddleware(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "Role not found in context"))
			c.Abort()
			return
		}

		userRole, ok := roleVal.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "Invalid role type in context"))
			c.Abort()
			return
		}

		// Convert to uppercase for case-insensitive comparison
		userRoleUpper := strings.ToUpper(userRole)

		for _, requiredRole := range requiredRoles {
			if userRoleUpper == strings.ToUpper(requiredRole) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You do not have permission to access this resource"))
		c.Abort()
	}
}
