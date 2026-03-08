package models

import "time"

type Order struct {
	BaseModel

	PostID           uint
	Post             Post
	UserID           uint
	User             User
	OrderQuantity    int
	OrderStatus      string
	OrderConfirmedAt *time.Time
	TotalPrice       float64
}
