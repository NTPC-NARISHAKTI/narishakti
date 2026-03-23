package models

type User struct {
	BaseModel

	EmpNo          string
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
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
