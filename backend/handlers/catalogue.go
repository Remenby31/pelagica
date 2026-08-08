package handlers

import (
	"log/slog"
	"strings"

	"pelagica-backend/models"
	"pelagica-backend/services"

	"github.com/gofiber/fiber/v3"
)

func sendBridgeResponse(c fiber.Ctx, resp *services.BridgeResponse, err error, op string) error {
	if err != nil {
		slog.Error("Catalogue bridge request failed", "op", op, "error", err)
		return c.Status(fiber.StatusBadGateway).JSON(models.APIError{Error: "Failed to reach catalogue bridge"})
	}

	c.Set("Content-Type", resp.ContentType)
	return c.Status(resp.StatusCode).Send(resp.Body)
}

// GetCatalogueSearch handles GET /api/catalogue/search?q=
func GetCatalogueSearch(c fiber.Ctx) error {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{Error: "Query parameter 'q' is required"})
	}

	resp, err := services.Bridge().SearchTorrents(query)
	return sendBridgeResponse(c, resp, err, "search")
}

// GetCatalogueMedia handles GET /api/catalogue/media/:id
func GetCatalogueMedia(c fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{Error: "Media id is required"})
	}

	resp, err := services.Bridge().GetMedia(id)
	return sendBridgeResponse(c, resp, err, "media")
}

// GetCatalogueStatus handles GET /api/catalogue/status/:id
func GetCatalogueStatus(c fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{Error: "Media id is required"})
	}

	resp, err := services.Bridge().GetDownloadStatus(id)
	return sendBridgeResponse(c, resp, err, "status")
}

// PostCatalogueDownload handles POST /api/catalogue/download/:id
func PostCatalogueDownload(c fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{Error: "Torrent id is required"})
	}

	resp, err := services.Bridge().DownloadTorrent(id)
	return sendBridgeResponse(c, resp, err, "download")
}
