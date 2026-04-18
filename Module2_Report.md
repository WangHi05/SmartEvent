# MODULE 2 - QUẢN LÝ SỰ KIỆN & CẤU HÌNH VÉ

**Ngày báo cáo:** 18/04/2026  
**Phiên bản:** 1.0  
**Trạng thái:** Hoàn thành 70% - Thiếu chức năng cấu hình vé chi tiết

---

## 📋 MỤC LỤC

1. [Chức năng chính](#chức-năng-chính)
2. [Phân tích Entity/Model](#phân-tích-entitymodel)
3. [Phân tích Database hiện tại](#phân-tích-database-hiện-tại)
4. [Đánh giá code hiện tại](#đánh-giá-code-hiện-tại)
5. [Thiếu sót & Đề xuất cải thiện](#thiếu-sót--đề-xuất-cải-thiện)
6. [Migration tiếp theo](#migration-tiếp-theo)
7. [Kết luận](#kết-luận)

---

## 🎯 Chức năng chính

### A. Quản lý sự kiện

#### 1. Thêm sự kiện ✅
- **Endpoint:** `POST /api/events`
- **Input:** Tên, Mô tả, Địa điểm, Thời gian khai mạc, Thời gian kết thúc, Sức chứa, Giá vé cơ sở, Thời hạn hủy
- **Validation:** ✅ Đầy đủ
  - Tên bắt buộc, không vượt 200 ký tự
  - Thời gian kết thúc phải sau thời gian bắt đầu
  - Sức chứa: 1-100,000 người
  - Giá vé >= 0
  - Thời hạn hủy: 0-720 giờ
- **Business Logic:** ✅ Hợp lý
  - Tự động set `CurrentOccupancy = 0`
  - Ghi log thao tác

#### 2. Sửa sự kiện ✅
- **Endpoint:** `PUT /api/events/{id}`
- **Validation:** ✅ Có validate ID phù hợp và ModelState
- **Business Logic:** ✅ Hợp lý
  - Cho phép cập nhật tuần tự từng trường
  - Ghi log thay đổi

#### 3. Xóa sự kiện ✅
- **Endpoint:** `DELETE /api/events/{id}`
- **Business Logic:** ✅ Tốt
  - Kiểm tra xem có vé đã bán chưa
  - **LƯU Ý:** Chỉ cho phép xóa nếu không có vé với trạng thái `Paid` hoặc `CheckedIn`
  - Ghi log xóa

#### 4. Xem danh sách sự kiện ✅
- **Endpoint:** `GET /api/events?pageNumber=1&pageSize=10`
- **Output:** EventListDto (Items, TotalCount, PageNumber, PageSize, TotalPages)
- **Sắp xếp:** By `StartTime` DESC (sự kiện sắp tới trước)
- **Phân trang:** ✅ Có

#### 5. Tìm kiếm sự kiện ❌ **THIẾU**
- ❌ Chưa có chức năng filter/search
- **Đề xuất:** Thêm endpoint `/api/events/search` với các tham số:
  - `searchTerm`: Tìm trong Name/Description
  - `location`: Lọc theo địa điểm
  - `startDateFrom`, `startDateTo`: Lọc theo khoảng thời gian
  - `isUpcoming`: Chỉ sự kiện sắp tới
  - `hasAvailableTickets`: Còn vé để bán

#### 6. Đổi trạng thái sự kiện ❌ **THIẾU**
- ❌ Event không có trường `Status`
- ❌ Chưa có logic chuyển trạng thái
- **Đề xuất:** Thêm enum `EventStatus`
  - `Draft` (0): Nháp
  - `Active` (1): Đang mở bán
  - `Ongoing` (2): Đang diễn ra
  - `Completed` (3): Đã kết thúc
  - `Cancelled` (4): Đã hủy
- **Endpoint:** `PATCH /api/events/{id}/status`

---

### B. Cấu hình vé

#### 1. Thêm loại vé / Cấu hình vé ❌ **THIẾU HOÀN TOÀN**

Hiện tại, hệ thống chưa có:
- ❌ Bảng/Entity `TicketType` riêng biệt
- ❌ DTOs để cấu hình vé
- ❌ Service method để quản lý cấu hình vé
- ❌ Controller endpoint

**Vấn đề hiện tại:**
```
Ticket entity hiện tại có:
- Price (giá chung)
- Type: TicketType (Individual hoặc Group) - Chỉ phân loại cá nhân/đoàn

Nhưng THIẾU:
- Category (VIP, Normal, Student, etc.)
- Sale start time (Mở bán từ lúc nào)
- Sale end time (Đóng bán từ lúc nào)
- Slot limit per person
- Tier-based pricing (VIP 500k, Normal 300k, Student 150k, ...)
```

#### 2. Giá vé ❌ **STATUS: Cơ bản**
- ✅ Có `BasePrice` ở Event
- ✅ Có `Price` ở Ticket
- ❌ Chưa có cấu hình giá theo tiers/categories

#### 3. Số lượng vé ✅ **Cơ bản**
- ✅ Event có `MaxCapacity`
- ✅ Event có `CurrentOccupancy`
- ✅ Ticket có `TotalQuantity` (cho group tickets)
- ❌ Chưa có giới hạn số lượng per ticket tier

#### 4. Thời gian mở bán - Đóng bán ❌ **THIẾU**
- ❌ Không có trường `SaleStartTime` / `SaleEndTime` ở Event
- ❌ Không có logic kiểm tra xem vé còn được phép bán không

#### 5. Giới hạn mua vé ❌ **THIẾU**
- ❌ Không có giới hạn số lượng vé mỗi người có thể mua
- ❌ Không có logic để kiểm tra lượng vé một user đã mua

---

## 📊 Phân tích Entity/Model

### 1. Event (Sự kiện)

**Thuộc tính:**

| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mục đích |
|-----------|------------|---------|---------|
| `Id` | Guid | ✅ | Primary Key |
| `Name` | string | ✅ | Tên sự kiện |
| `Description` | string | ✅ | Mô tả chi tiết |
| `Location` | string | ✅ | Địa điểm |
| `StartTime` | DateTime | ✅ | Thời gian bắt đầu |
| `EndTime` | DateTime | ✅ | Thời gian kết thúc |
| `MaxCapacity` | int | ✅ | Sức chứa tối đa |
| `CurrentOccupancy` | int | ✅ | Số người hiện tại |
| `BasePrice` | decimal(18,2) | ✅ | Giá vé cơ sở |
| `CancellationDeadlineHours` | int | ✅ | Thời hạn hủy (giờ) |
| `CreatedAt` | DateTime | ✅ | Ngày tạo |
| `UpdatedAt` | DateTime? | ❌ | Ngày cập nhật |
| `CreatedBy` | string? | ❌ | Người tạo |
| `UpdatedBy` | string? | ❌ | Người cập nhật |

**❌ THIẾU CÁC TRƯỜNG:**
- `Status` (Draft, Active, Ongoing, Completed, Cancelled)
- `SaleStartTime` (Mở bán từ lúc nào)
- `SaleEndTime` (Đóng bán từ lúc nào)
- `Category` (Concert, Conference, Sport, ...)
- `Organizer` (Tổ chức sự kiện)
- `Website` / `ContactEmail` (Thông tin liên hệ)

**Quan hệ:**
- **1 → N:** Event → Tickets (One Event has Many Tickets)
  ```csharp
  public virtual ICollection<Ticket> Tickets { get; set; }
  ```
  ✅ Đúng, được cấu hình trong OnModelCreating

**Vai trò trong hệ thống:**
- Entity cha, quản lý toàn bộ thông tin sự kiện
- Liên kết với Tickets để quản lý vé bán ra
- Là nơi lưu cấu hình chính sách hoàn tiền

---

### 2. Ticket (Vé)

**Thuộc tính:**

| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mục đích |
|-----------|------------|---------|---------|
| `Id` | Guid | ✅ | Primary Key |
| `EventId` | Guid | ✅ | FK → Event |
| `UserId` | Guid? | ❌ | FK → User (Người mua) |
| `QRCodeData` | string | ✅ | Dữ liệu QR |
| `Status` | TicketStatus | ✅ | Trạng thái vé |
| `Type` | TicketType | ✅ | Individual / Group |
| `Price` | decimal(18,2) | ✅ | Giá vé |
| `GroupMode` | QRCodeMode? | ❌ | Mode QR (cho group) |
| `TotalQuantity` | int | ✅ | Số lượng vé (mode 1) |
| `CheckedInCount` | int | ✅ | Số người đã vào |
| `CreatedAt` | DateTime | ✅ | Ngày tạo |
| `UpdatedAt` | DateTime? | ❌ | Ngày cập nhật |
| `CreatedBy` | string? | ❌ | Người tạo |
| `UpdatedBy` | string? | ❌ | Người cập nhật |

**❌ THIẾU CÁC TRƯỜNG:**
- `TicketTypeId` (FK → TicketType) - để phân loại VIP/Normal/Student
- `PurchaseTime` (Lúc mua)
- `PaymentMethod` (Cách thanh toán)
- `IsTransferable` (Có thể chuyển nhượng được không)

**Quan hệ:**
- **N → 1:** Ticket → Event (Many Tickets belong to One Event) ✅
- **N → 1:** Ticket → User (Many Tickets purchased by One User) ✅
  ```csharp
  public Guid? UserId { get; set; }
  public virtual User? User { get; set; }
  ```
- **1 → N:** Ticket (Group) → SubTickets ✅
  ```csharp
  public virtual ICollection<SubTicket> SubTickets { get; set; }
  ```

**Enum TicketStatus:**
```csharp
public enum TicketStatus
{
    Pending = 0,    // Chờ thanh toán
    Paid = 1,       // Đã thanh toán
    Cancelled = 2,  // Đã hủy
    Refunded = 3,   // Đã hoàn tiền
    CheckedIn = 4,  // Đã vào cổng
    Expired = 5     // Hết hạn
}
```

**Enum TicketType:**
```csharp
public enum TicketType
{
    Individual = 1, // Vé cá nhân
    Group = 2       // Vé đoàn
}
```

**Enum QRCodeMode:**
```csharp
public enum QRCodeMode
{
    SingleQRForGroup = 1,      // Một mã QR tổng cho cả đoàn
    IndividualQRPerMember = 2  // Mỗi thành viên một mã QR riêng
}
```

**Vai trò trong hệ thống:**
- Quản lý thông tin vé (cá nhân hoặc đoàn)
- Liên kết User với Event (ai mua/sở hữu vé nào)
- Support 2 modes cho vé đoàn
- Có logic check-in tích hợp

---

### 3. SubTicket (Vé con - cho Group Ticket Mode 2)

**Thuộc tính:**

| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mục đích |
|-----------|------------|---------|---------|
| `Id` | Guid | ✅ | Primary Key |
| `ParentTicketId` | Guid | ✅ | FK → Ticket (Group) |
| `QRCodeData` | string | ✅ | QR code riêng |
| `Status` | TicketStatus | ✅ | Trạng thái |
| `CheckInTime` | DateTime? | ❌ | Thời gian check-in |
| `GuestName` | string? | ❌ | Tên khách (VIP) |
| `Note` | string? | ❌ | Ghi chú |

**Quan hệ:**
- **N → 1:** SubTicket → Ticket ✅
  ```csharp
  public Guid ParentTicketId { get; set; }
  public virtual Ticket? ParentTicket { get; set; }
  ```
  OnDelete: Cascade (Xóa Ticket cha → xóa SubTickets)

**Vai trò trong hệ thống:**
- Đại diện cho từng vé con trong đoàn (Mode 2)
- Cho phép tracking check-in chi tiết từng thành viên
- Support thông tin khách (VIP, truyền thông)

---

### 4. TicketType (❌ THIẾU - Cần thêm)

**Thuộc tính đề xuất:**

| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mục đích |
|-----------|------------|---------|---------|
| `Id` | Guid | ✅ | Primary Key |
| `EventId` | Guid | ✅ | FK → Event |
| `Name` | string | ✅ | VIP, Normal, Student, ... |
| `Price` | decimal(18,2) | ✅ | Giá vé loại này |
| `MaxCapacity` | int | ✅ | Số lượng vé loại này |
| `RemainingCapacity` | int | ✅ | Số vé còn lại |
| `SaleStartTime` | DateTime | ✅ | Mở bán từ lúc nào |
| `SaleEndTime` | DateTime | ✅ | Đóng bán từ lúc nào |
| `MaxPerPerson` | int | ✅ | Giới hạn mua per người |
| `Description` | string? | ❌ | Mô tả loại vé |
| `DisplayOrder` | int | ✅ | Thứ tự hiển thị |
| `IsActive` | bool | ✅ | Có còn bán không |

**Quan hệ:**
- **1 → N:** Event → TicketTypes
- **1 → N:** TicketType → Tickets

**Vai trò:**
- Quản lý cấu hình vé chi tiết cho mỗi sự kiện
- Thiết lập giá, số lượng, thời gian bán, giới hạn mua
- Hỗ trợ bán vé theo tiers khác nhau

---

### 5. User (Người dùng) ✅

**Thuộc tính hiện tại:**
- `Id`, `Username`, `Email`, `PasswordHash`, `FullName`, `PhoneNumber`
- `Role` (Admin, Manager, Staff)
- `IsActive`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`

**Quan hệ:**
- **1 → N:** User → Tickets (PurchasedTickets)
  ```csharp
  public virtual ICollection<Ticket> PurchasedTickets { get; set; }
  ```
  ✅ Đúng, OnDelete: SetNull

---

## 🗄️ Phân tích Database hiện tại

### Bảng hiện tại (theo Migration cuối cùng):

1. **Users** ✅
   - `Id` (PK, uniqueidentifier)
   - `Username`, `Email`, `PasswordHash`, `FullName`
   - `PhoneNumber` (nullable)
   - `Role` (int - enum)
   - `IsActive` (bit)
   - Audit fields: `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`

2. **Events** ✅
   - `Id` (PK, uniqueidentifier)
   - `Name`, `Description`, `Location`
   - `StartTime`, `EndTime`, `MaxCapacity`, `CurrentOccupancy`
   - `BasePrice` (decimal 18,2)
   - `CancellationDeadlineHours` (int)
   - Audit fields

3. **Tickets** ✅
   - `Id` (PK)
   - `EventId` (FK → Events)
   - `UserId` (FK → Users, nullable)
   - `QRCodeData`
   - `Status`, `Type`, `GroupMode` (int - converted from enum)
   - `Price` (decimal 18,2)
   - `TotalQuantity`, `CheckedInCount`
   - Audit fields

4. **SubTickets** ✅
   - `Id` (PK)
   - `ParentTicketId` (FK → Tickets, cascade delete)
   - `QRCodeData`
   - `Status` (int)
   - `CheckInTime` (nullable)
   - `GuestName`, `Note` (nullable)

5. **AuditLogs** ✅
   - `Id` (PK)
   - `Timestamp`
   - `Action`, `EntityType`, `EntityId`
   - `PerformedBy`, `Details`, `IpAddress`
   - Audit fields

### ❌ CÁC BẢNG THIẾU:

1. **TicketTypes** - Để cấu hình loại vé (VIP, Normal, Student)
2. **EventStatus** - Để track trạng thái sự kiện
3. **PaymentRecords** - Để lưu lịch sử thanh toán (nếu cần)
4. **TicketTransfers** - Để track chuyển nhượng vé (nếu cho phép)

### ✅ Phân tích độ hoàn chỉnh:

| Yêu cầu | Status | Ghi chú |
|--------|--------|---------|
| Lưu sự kiện | ✅ | Events table đầy đủ |
| Lưu vé | ✅ | Tickets + SubTickets table đầy đủ |
| Lưu người dùng | ✅ | Users table đầy đủ |
| Lưu audit log | ✅ | AuditLogs table đầy đủ |
| **Cấu hình vé theo tiers** | ❌ | **Cần thêm TicketTypes table** |
| **Trạng thái sự kiện** | ❌ | **Cần thêm Status column to Events** |
| **Mở/đóng bán vé** | ❌ | **Cần thêm SaleStartTime/SaleEndTime** |
| **Giới hạn mua vé** | ❌ | **Cần thêm MaxPerPerson column** |

---

## 📝 Đánh giá code hiện tại

### ✅ ĐIỂM MẠNH:

1. **Architecture tốt:**
   - Clean Architecture (Domain, Application, Infrastructure, API layers)
   - Dependency Injection được sử dụng đúng
   - Repository Pattern implement chính xác

2. **Design Patterns:**
   - Strategy Pattern cho Refund (FullRefundStrategy, PartialRefundStrategy, NoRefundStrategy) ✅
   - DTOs cho request/response ✅

3. **Validation:**
   - ✅ DTOs có DataAnnotations validation
   - ✅ Business logic validation trong Service (thời gian, sức chứa, điều kiện hủy)

4. **Logging & Audit:**
   - ✅ Có AuditLog system
   - ✅ Ghi log hành động Create, Update, Delete

5. **Entity Relationships:**
   - ✅ ForeignKey relationships được cấu hình đúng
   - ✅ Cascade delete được set đúng cho SubTickets

6. **Error Handling:**
   - ✅ Có try-catch trong controller
   - ✅ Trả về HTTP status codes phù hợp (200, 201, 400, 404, 500)

7. **Business Logic:**
   - ✅ Kiểm tra điều kiện xóa sự kiện (không xóa nếu có vé đã bán)
   - ✅ Kiểm tra thời gian hủy vé
   - ✅ Tính toán hoàn tiền theo strategy khác nhau

---

### ❌ ĐIỂM YẾU & THIẾU SÓT:

1. **Chức năng cấu hình vé THIẾU HOÀN TOÀN:**
   - ❌ Không có service/controller để tạo/cập nhật TicketType
   - ❌ Không có endpoint để cấu hình giá, số lượng, thời gian bán
   - ❌ Không có validation cho thời gian mở/đóng bán
   - ❌ Không có kiểm tra giới hạn mua vé per người

2. **Event Management:**
   - ❌ Không có trường/endpoint để đổi trạng thái sự kiện
   - ❌ Không có feature tìm kiếm/filter sự kiện
   - ❌ Không validate thời gian bán vé

3. **Ticket Operations:**
   - ❌ Không có endpoint để xem danh sách vé của sự kiện
   - ❌ Không có endpoint để xem vé của user
   - ❌ Không có feature check-in (kiểm tra vé, quét QR)
   - ❌ Không có logic để xử lý vé hết hạn

4. **Data Validation:**
   - ❌ Chưa validate IsActive cho events (có nên xóa/disable)
   - ❌ Chưa validate ngày check-in phải trong khoảng thời gian sự kiện

5. **API Design:**
   - ❌ Chưa có versioning (v1, v2)
   - ✅ Có Swagger comments nhưng chưa generate Swagger UI

6. **Testing:**
   - ❌ Không có unit tests
   - ❌ Không có integration tests

---

## 🚨 Thiếu sót & Đề xuất cải thiện

### Ưu tiên NGAY VĂN:

#### 1. **Tạo TicketType Entity & Cấu hình vé**

**File cần tạo:**
- `TicketSystem.Domain/Entities/TicketType.cs`
- `TicketSystem.Application/DTOs/TicketTypeDtos.cs`
- `TicketSystem.Application/Services/TicketTypeService.cs`
- `TicketSystem.API/Controllers/TicketTypesController.cs`

**TicketType.cs:**
```csharp
public class TicketType : BaseEntity
{
    public Guid EventId { get; set; }
    public virtual Event? Event { get; set; }
    
    public string Name { get; set; } // VIP, Normal, Student
    public string Description { get; set; }
    public decimal Price { get; set; }
    public int MaxCapacity { get; set; }
    public int RemainingCapacity { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public int MaxPerPerson { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
```

**DTOs:**
```csharp
public class CreateTicketTypeDto
{
    public Guid EventId { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Price { get; set; }
    public int MaxCapacity { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public int MaxPerPerson { get; set; }
}

public class TicketTypeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int RemainingCapacity { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public int MaxPerPerson { get; set; }
}
```

**Endpoints cần thêm:**
```
POST   /api/events/{eventId}/ticket-types         - Tạo loại vé
GET    /api/events/{eventId}/ticket-types         - Xem loại vé
GET    /api/event-types/{id}                      - Chi tiết loại vé
PUT    /api/ticket-types/{id}                     - Cập nhật loại vé
DELETE /api/ticket-types/{id}                     - Xóa loại vé
```

---

#### 2. **Thêm Event Status**

**Enum EventStatus:**
```csharp
public enum EventStatus
{
    Draft = 0,      // Nháp
    Active = 1,     // Đang mở bán
    Ongoing = 2,    // Đang diễn ra
    Completed = 3,  // Đã kết thúc
    Cancelled = 4   // Đã hủy
}
```

**Migration:**
```sql
ALTER TABLE Events ADD Status INT DEFAULT 1;
ALTER TABLE Events ADD SaleStartTime DATETIME2;
ALTER TABLE Events ADD SaleEndTime DATETIME2;
```

**Endpoint:**
```
PATCH /api/events/{id}/status - Đổi trạng thái sự kiện
```

---

#### 3. **Thêm chức năng tìm kiếm sự kiện**

**Endpoint:**
```
GET /api/events/search?
    searchTerm=keyword&
    location=HaNoi&
    startDateFrom=2026-05-01&
    startDateTo=2026-05-31&
    isUpcoming=true&
    hasAvailableTickets=true
```

---

### Ưu tiên TIẾP THEO:

#### 4. **Ticket Check-in & QR validation**
- Endpoint: `POST /api/tickets/{id}/checkin`
- Validation QR code
- Update status Paid → CheckedIn

#### 5. **List Tickets by Event/User**
- `GET /api/events/{eventId}/tickets`
- `GET /api/users/{userId}/tickets`

#### 6. **Bulk Operations**
- `POST /api/tickets/bulk-create` - Tạo nhiều vé cùng lúc
- `POST /api/tickets/bulk-cancel` - Hủy nhiều vé

---

## 🔄 Migration tiếp theo

### Migration #4: AddTicketTypesTable

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.CreateTable(
        name: "TicketTypes",
        columns: table => new
        {
            Id = table.Column<Guid>(nullable: false),
            EventId = table.Column<Guid>(nullable: false),
            Name = table.Column<string>(maxLength: 100, nullable: false),
            Description = table.Column<string>(maxLength: 500, nullable: true),
            Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
            MaxCapacity = table.Column<int>(nullable: false),
            RemainingCapacity = table.Column<int>(nullable: false),
            SaleStartTime = table.Column<DateTime>(nullable: false),
            SaleEndTime = table.Column<DateTime>(nullable: false),
            MaxPerPerson = table.Column<int>(nullable: false),
            DisplayOrder = table.Column<int>(nullable: false, defaultValue: 0),
            IsActive = table.Column<bool>(nullable: false, defaultValue: true),
            CreatedAt = table.Column<DateTime>(nullable: false),
            UpdatedAt = table.Column<DateTime>(nullable: true),
            CreatedBy = table.Column<string>(nullable: true),
            UpdatedBy = table.Column<string>(nullable: true)
        },
        constraints: table =>
        {
            table.PrimaryKey("PK_TicketTypes", x => x.Id);
            table.ForeignKey(
                name: "FK_TicketTypes_Events_EventId",
                column: x => x.EventId,
                principalTable: "Events",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        });

    migrationBuilder.CreateIndex(
        name: "IX_TicketTypes_EventId",
        table: "TicketTypes",
        column: "EventId");
}
```

### Migration #5: AddEventStatusAndSaleTiming

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<int>(
        name: "Status",
        table: "Events",
        nullable: false,
        defaultValue: 1); // Active

    migrationBuilder.AddColumn<DateTime>(
        name: "SaleStartTime",
        table: "Events",
        nullable: true);

    migrationBuilder.AddColumn<DateTime>(
        name: "SaleEndTime",
        table: "Events",
        nullable: true);
}
```

### Migration #6: AddTicketTypeIdToTickets

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<Guid>(
        name: "TicketTypeId",
        table: "Tickets",
        nullable: true);

    migrationBuilder.CreateIndex(
        name: "IX_Tickets_TicketTypeId",
        table: "Tickets",
        column: "TicketTypeId");

    migrationBuilder.AddForeignKey(
        name: "FK_Tickets_TicketTypes_TicketTypeId",
        table: "Tickets",
        column: "TicketTypeId",
        principalTable: "TicketTypes",
        principalColumn: "Id",
        onDelete: ReferentialAction.SetNull);
}
```

---

## 📊 Bảng tóm tắt tiến độ

| Chức năng | Trạng thái | Ghi chú |
|----------|-----------|--------|
| **Quản lý sự kiện** | | |
| Thêm sự kiện | ✅ 100% | Hoàn thành |
| Sửa sự kiện | ✅ 100% | Hoàn thành |
| Xóa sự kiện | ✅ 100% | Hoàn thành |
| Xem danh sách | ✅ 100% | Hoàn thành, có phân trang |
| 🔍 Tìm kiếm | ❌ 0% | **THIẾU** |
| 🔄 Đổi trạng thái | ❌ 0% | **THIẾU** - Cần thêm Status enum |
| **Cấu hình vé** | | |
| Thêm loại vé | ❌ 0% | **THIẾU HOÀN TOÀN** |
| Giá vé | ⚠️ 30% | Có BasePrice, thiếu tiers |
| Số lượng vé | ⚠️ 60% | Có MaxCapacity, thiếu per-tier |
| Mở/đóng bán | ❌ 0% | **THIẾU** |
| Giới hạn mua | ❌ 0% | **THIẾU** |
| **Làm việc thêm** | | |
| Vé check-in | ⚠️ 20% | Có logic preview, thiếu endpoint |
| Hoàn tiền | ✅ 100% | Strategy Pattern hoàn hảo |
| QR code | ✅ 100% | Có field, thiếu generation logic |
| Audit log | ✅ 100% | Hoàn thành |

**Tổng tiến độ Module 2: ~70%**

---

## 📍 Kết luận

### ✅ Những gì đã hoàn tành:

1. **Entity Model hoàn chỉnh** cho Ticket (cá nhân & đoàn)
2. **CRUD Events** fully functional
3. **Refund Strategy** với 3 policy khác nhau
4. **Audit Tracking** tất cả hành động
5. **Database Schema** chính xác với relationships

### ❌ Những gì cần hoàn thiện cấp bách:

1. **TicketType Entity & Service** - Cấu hình vé theo types (VIP, Normal, Student)
2. **Event Status Tracking** - Draft, Active, Ongoing, Completed, Cancelled
3. **Sale Timing Configuration** - Mở/đóng bán vé
4. **Purchase Limit** - Giới hạn số vé per người
5. **Search/Filter Events** - Tìm kiếm sự kiện
6. **Ticket Check-in Endpoint** - Quét QR và check-in
7. **List Tickets** - Xem vé theo sự kiện hoặc người dùng

### 🎯 Đề xuất Next Steps:

**Tuần 1-2:**
- [ ] Tạo TicketType entity & migration
- [ ] Implement TicketTypeService & Controller
- [ ] Thêm Event Status enum & migration
- [ ] Unit tests cho TicketTypeService

**Tuần 3:**
- [ ] Implement Search/Filter Events
- [ ] Implement Ticket Check-in
- [ ] Implement Bulk Operations

**Tuần 4:**
- [ ] Integration tests
- [ ] API documentation/Swagger
- [ ] Performance optimization (indexing)

---

## 📎 Tài liệu tham khảo

- **Architecture:** Clean Architecture (Domain → Application → Infrastructure → API)
- **Database:** SQL Server 2019+, EF Core 9.0
- **Patterns:** Repository, Strategy, Dependency Injection
- **Validation:** Data Annotations + Custom Business Logic Validation

---

**Phê duyệt:** Chờ review từ Technical Lead  
**Cập nhật lần cuối:** 18/04/2026
