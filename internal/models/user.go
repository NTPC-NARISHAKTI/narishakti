package models

type User struct {
	BaseModel

	EmpNo          string
	Name           string `gorm:"size:255;not null"`
	PhoneNo        string `gorm:"size:20"`
	ProjectID      uint
	Project        Project
	Email          string `gorm:"uniqueIndex"`
	PasswordHash   string
	Role           string
	ApprovalStatus string
}
