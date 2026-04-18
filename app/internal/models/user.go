package models

type User struct {
	BaseModel

	EmpNo          string `gorm:"uniqueIndex"`
	Name           string `gorm:"size:255;not null"`
	PhoneNo        string `gorm:"size:20"`
	ProjectID      *uint
	Project        Project
	Email          string `gorm:"uniqueIndex"`
	PasswordHash   string
	Role           string
	ApprovalStatus string
}

type RegisterInput struct {
	Name            string `json:"name" binding:"required"`
	EmpNo           string `json:"empNo" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirmPassword" binding:"required,eqfield=Password"`
	ProjectID       *uint  `json:"projectId" binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
