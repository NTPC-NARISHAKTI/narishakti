package models

type User struct {
	BaseModel

	EmpNo          *string `gorm:"uniqueIndex"`
	Name           string  `gorm:"size:255;not null"`
	PhoneNo        string  `gorm:"size:20"`
	ProjectID      *uint
	Project        Project
	Email          string `gorm:"uniqueIndex"`
	PasswordHash   string `json:"-"`
	Role           string
	ApprovalStatus string
}

type RegisterInput struct {
	Name            string `json:"name" binding:"required"`
	EmpNo           string `json:"empNo"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirmPassword" binding:"required,eqfield=Password"`
	ProjectID       *uint  `json:"projectId" binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

type AdminResetPasswordInput struct {
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

// StringOrNil converts an empty string to a nil pointer, and a non-empty
// string to a pointer to that string. Used to store optional text fields
// (e.g. EmpNo) as SQL NULL instead of "" so uniqueIndex constraints don't
// collide across multiple "empty" values.
func StringOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
