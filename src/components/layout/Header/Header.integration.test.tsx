import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "./Header";

// Mock React DOM portal for Modal rendering
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (element: any) => element,
  };
});

// Mock the order config store with real implementation
const mockConfig = {
  deliveryMode: "delivery" as const,
  orderTiming: {
    type: "now" as const,
  },
  deliveryAddress: undefined,
};

const mockSetOrderTiming = vi.fn();
const mockSetDeliveryAddress = vi.fn();

vi.mock("@/store/orderConfigStore", () => ({
  useOrderConfigStore: () => ({
    config: mockConfig,
    setDeliveryMode: vi.fn(),
    setOrderTiming: mockSetOrderTiming,
    setDeliveryAddress: mockSetDeliveryAddress,
  }),
}));

describe("Header Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens order timing modal when timing button is clicked", async () => {
    render(<Header />);

    const timingButton = screen.getByLabelText(/Thời gian giao hàng/);
    fireEvent.click(timingButton);

    await waitFor(() => {
      expect(screen.getByText("Thời gian nhận hàng")).toBeInTheDocument();
    });

    // Check for radio options specifically
    expect(screen.getByDisplayValue("now")).toBeInTheDocument();
    expect(screen.getByDisplayValue("scheduled")).toBeInTheDocument();
  });

  it("opens address modal when address button is clicked", async () => {
    render(<Header />);

    const addressButton = screen.getByLabelText(/Địa chỉ giao hàng/);
    fireEvent.click(addressButton);

    await waitFor(() => {
      expect(screen.getByText("Địa chỉ giao hàng")).toBeInTheDocument();
    });

    expect(screen.getByText("Địa chỉ cụ thể")).toBeInTheDocument();
    expect(screen.getByText("Quận/Huyện")).toBeInTheDocument();
  });

  it("closes modals when cancel is clicked", async () => {
    render(<Header />);

    // Open timing modal
    fireEvent.click(screen.getByLabelText(/Thời gian giao hàng/));

    await waitFor(() => {
      expect(screen.getByText("Thời gian nhận hàng")).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByText("Hủy"));

    await waitFor(() => {
      expect(screen.queryByText("Thời gian nhận hàng")).not.toBeInTheDocument();
    });
  });

  it("updates timing when 'Giao ngay' is selected and confirmed", async () => {
    render(<Header />);

    // Open timing modal
    fireEvent.click(screen.getByLabelText(/Thời gian giao hàng/));

    await waitFor(() => {
      expect(screen.getByText("Thời gian nhận hàng")).toBeInTheDocument();
    });

    // Select "Giao ngay" and confirm
    const radioButton = screen.getByDisplayValue("now");
    fireEvent.click(radioButton);
    fireEvent.click(screen.getByText("Xác nhận"));

    expect(mockSetOrderTiming).toHaveBeenCalledWith({
      type: "now",
    });
  });

  it("requires date and time when scheduled timing is selected", async () => {
    render(<Header />);

    // Open timing modal
    fireEvent.click(screen.getByLabelText(/Thời gian giao hàng/));

    await waitFor(() => {
      expect(screen.getByText("Đặt trước")).toBeInTheDocument();
    });

    // Select "Đặt trước"
    const scheduledRadio = screen.getByDisplayValue("scheduled");
    fireEvent.click(scheduledRadio);

    // Confirm button should be disabled initially
    const confirmButton = screen.getByText("Xác nhận");
    expect(confirmButton).toBeDisabled();

    // Fill in date and time
    const dateInput = screen.getByLabelText(/Ngày giao hàng/);
    const timeInput = screen.getByLabelText(/Giờ giao hàng/);

    fireEvent.change(dateInput, { target: { value: "2024-12-25" } });
    fireEvent.change(timeInput, { target: { value: "14:30" } });

    // Confirm button should be enabled
    expect(confirmButton).not.toBeDisabled();

    // Confirm selection
    fireEvent.click(confirmButton);

    expect(mockSetOrderTiming).toHaveBeenCalledWith({
      type: "scheduled",
      scheduledDate: "2024-12-25",
      scheduledTime: "14:30",
    });
  });

  it("updates address when form is filled and confirmed", async () => {
    render(<Header />);

    // Open address modal
    fireEvent.click(screen.getByLabelText(/Địa chỉ giao hàng/));

    await waitFor(() => {
      expect(screen.getByText("Địa chỉ giao hàng")).toBeInTheDocument();
    });

    // Fill in address form
    const streetInput = screen.getByPlaceholderText(/Số nhà, tên đường/);
    const districtInput = screen.getByPlaceholderText(/Chọn hoặc nhập quận/);

    fireEvent.change(streetInput, { target: { value: "123 Phố Huế" } });
    fireEvent.change(districtInput, { target: { value: "Hai Bà Trưng" } });

    // Confirm
    fireEvent.click(screen.getByText("Xác nhận"));

    expect(mockSetDeliveryAddress).toHaveBeenCalledWith({
      street: "123 Phố Huế",
      district: "Hai Bà Trưng",
      city: "Hà Nội",
    });
  });

  it("validates required fields in address form", async () => {
    render(<Header />);

    // Open address modal
    fireEvent.click(screen.getByLabelText(/Địa chỉ giao hàng/));

    await waitFor(() => {
      expect(screen.getByText("Địa chỉ giao hàng")).toBeInTheDocument();
    });

    // Confirm button should be disabled without required fields
    const confirmButton = screen.getByText("Xác nhận");
    expect(confirmButton).toBeDisabled();

    // Fill only street
    const streetInput = screen.getByPlaceholderText(/Số nhà, tên đường/);
    fireEvent.change(streetInput, { target: { value: "123 Phố Huế" } });

    // Still disabled without district
    expect(confirmButton).toBeDisabled();

    // Fill district
    const districtInput = screen.getByPlaceholderText(/Chọn hoặc nhập quận/);
    fireEvent.change(districtInput, { target: { value: "Hai Bà Trưng" } });

    // Now should be enabled
    expect(confirmButton).not.toBeDisabled();
  });
});
