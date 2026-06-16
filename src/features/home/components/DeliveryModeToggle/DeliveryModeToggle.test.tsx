import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { DeliveryModeToggle } from "./DeliveryModeToggle";
import { useOrderConfigStore } from "@/store/orderConfigStore";

// Test component to verify the DeliveryModeToggle functionality
describe("DeliveryModeToggle", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useOrderConfigStore.getState().setDeliveryMode("delivery");
  });

  it("renders both delivery options", () => {
    render(<DeliveryModeToggle />);

    expect(screen.getByText("Giao tận nơi")).toBeInTheDocument();
    expect(screen.getByText("Đến cửa hàng lấy")).toBeInTheDocument();
  });

  it("highlights the delivery option by default", () => {
    render(<DeliveryModeToggle />);

    const deliveryButton = screen.getByText("Giao tận nơi");
    const pickupButton = screen.getByText("Đến cửa hàng lấy");

    expect(deliveryButton).toHaveAttribute("aria-pressed", "true");
    expect(pickupButton).toHaveAttribute("aria-pressed", "false");
  });

  it("updates store when pickup option is selected", () => {
    render(<DeliveryModeToggle />);

    const pickupButton = screen.getByText("Đến cửa hàng lấy");
    fireEvent.click(pickupButton);

    expect(useOrderConfigStore.getState().config.deliveryMode).toBe("pickup");
  });

  it("updates store when delivery option is selected", () => {
    // First set to pickup
    useOrderConfigStore.getState().setDeliveryMode("pickup");

    render(<DeliveryModeToggle />);

    const deliveryButton = screen.getByText("Giao tận nơi");
    fireEvent.click(deliveryButton);

    expect(useOrderConfigStore.getState().config.deliveryMode).toBe("delivery");
  });

  it("highlights the correct option based on store state", () => {
    // Set store to pickup mode
    useOrderConfigStore.getState().setDeliveryMode("pickup");

    render(<DeliveryModeToggle />);

    const deliveryButton = screen.getByText("Giao tận nơi");
    const pickupButton = screen.getByText("Đến cửa hàng lấy");

    expect(deliveryButton).toHaveAttribute("aria-pressed", "false");
    expect(pickupButton).toHaveAttribute("aria-pressed", "true");
  });

  it("has minimum 48px height for touch targets", () => {
    render(<DeliveryModeToggle />);

    const container = screen.getByText("Giao tận nơi").closest("div");
    expect(container).toHaveClass("min-h-[48px]");
  });

  it("applies custom className prop", () => {
    const { container } = render(
      <DeliveryModeToggle className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("provides keyboard accessibility", () => {
    render(<DeliveryModeToggle />);

    const deliveryButton = screen.getByText("Giao tận nơi");
    const pickupButton = screen.getByText("Đến cửa hàng lấy");

    // Verify buttons are focusable
    expect(deliveryButton.tagName).toBe("BUTTON");
    expect(pickupButton.tagName).toBe("BUTTON");

    // Verify buttons have type="button" to prevent form submission
    expect(deliveryButton).toHaveAttribute("type", "button");
    expect(pickupButton).toHaveAttribute("type", "button");
  });
});
