import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosCustomerBox } from "./PosCustomerBox";

describe("PosCustomerBox", () => {
  it("shows a compact walk-in customer card by default", () => {
    render(
      <PosCustomerBox
        customer={{ name: "", phone: "" }}
        onCustomerChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Khách lẻ")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("SĐT hoặc tên khách")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tìm / Thêm" }));
    expect(screen.getByPlaceholderText("SĐT hoặc tên khách")).toHaveFocus();
  });

  it("only attaches a new customer name after confirmation", () => {
    const onCustomerChange = vi.fn();
    render(
      <PosCustomerBox
        customer={{ name: "", phone: "" }}
        onCustomerChange={onCustomerChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tìm / Thêm" }));
    fireEvent.change(screen.getByPlaceholderText("SĐT hoặc tên khách"), {
      target: { value: "Nguyễn Văn An" },
    });

    expect(onCustomerChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Dùng khách mới/ }));
    expect(onCustomerChange).toHaveBeenLastCalledWith({
      name: "Nguyễn Văn An",
      phone: "",
    });
  });

  it("normalizes a new customer phone number after confirmation", () => {
    const onCustomerChange = vi.fn();
    render(
      <PosCustomerBox
        customer={{ name: "", phone: "" }}
        onCustomerChange={onCustomerChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tìm / Thêm" }));
    fireEvent.change(screen.getByPlaceholderText("SĐT hoặc tên khách"), {
      target: { value: "035 894 9791" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Dùng khách mới/ }));

    expect(onCustomerChange).toHaveBeenLastCalledWith({
      name: "",
      phone: "0358949791",
    });
  });

  it("shows selected customer details and supports removing the customer", () => {
    const onCustomerChange = vi.fn();
    render(
      <PosCustomerBox
        customer={{
          id: "customer-1",
          name: "Nguyễn Văn An",
          phone: "0901234567",
          loyaltyPoints: 120,
          tier: "gold",
        }}
        onCustomerChange={onCustomerChange}
      />,
    );

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText(/0901234567.*gold.*120 điểm/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ khách" }));
    expect(onCustomerChange).toHaveBeenCalledWith({ name: "", phone: "" });
  });
});
