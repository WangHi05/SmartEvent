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
---

## 🔍 Phân tích Requirements vs Implementation

### 2.1. Quản lý thông tin sự kiện

**Role:** Admin, Quản lý (QL)

| Yêu cầu | Implementation | Status |
|--------|-----------------|--------|
| **Thiết lập thông tin sự kiện** (thời gian, địa điểm, sức chứa) | `Event` entity + `EventService.CreateEventAsync()` | ✅ DONE |
| **Thời gian:** StartTime, EndTime | `Event.StartTime`, `Event.EndTime` | ✅ DONE |
| **Địa điểm:** Location | `Event.Location` | ✅ DONE |
| **Sức chứa tối đa:** MaxCapacity | `Event.MaxCapacity` | ✅ DONE |
| **Quản lý phân loại vé** (cá nhân / đoàn) | `Ticket.Type` enum (Individual, Group) | ✅ DONE |
| **Cập nhật thông tin sự kiện** | `EventService.UpdateEventAsync()` | ✅ DONE |
| **Xem danh sách sự kiện** | `EventService.GetEventsAsync()` | ✅ DONE |
| **Xem chi tiết sự kiện** | `EventService.GetEventByIdAsync()` | ✅ DONE |
| **Xóa sự kiện** | `EventService.DeleteEventAsync()` | ✅ DONE |
| ❌ **Role-based access control** | `[Authorize(Roles = "Admin,Manager")]` (commented) | ⚠️ PARTIAL |
| ❌ **Trạng thái sự kiện** (Draft→Active→Ongoing→Completed→Cancelled) | Không có `Status` field | ❌ MISSING |

---

### 2.2. Cấu hình bán vé & Chính sách

#### A. Cấu hình thông số vé

| Yêu cầu | Implementation | Status |
|--------|-----------------|--------|
| **Giá vé** | `Event.BasePrice` + `Ticket.Price` | ⚠️ BASIC |
| **Giới hạn số lượng** | `Event.MaxCapacity` (toàn bộ event) | ⚠️ PARTIAL |
| ❌ **Giới hạn số lượng per ticket type** | Không có `TicketType` entity | ❌ MISSING |
| ❌ **Thời gian mở bán** | Không có `SaleStartTime` | ❌ MISSING |
| ❌ **Thời gian đóng bán** | Không có `SaleEndTime` | ❌ MISSING |
| ❌ **Giới hạn mua per người** | Không có `MaxPerPerson` logic | ❌ MISSING |
| ❌ **Cấu hình vé theo tiers** (VIP, Normal, Student) | Không có `TicketType` entity | ❌ MISSING |

**Tình trạng:** ⚠️ **30% hoàn thành** - Chỉ có giá cơ bản, thiếu cấu hình chi tiết

---

#### B. Cấu hình chính sách hủy vé

| Yêu cầu | Implementation | Status |
|--------|-----------------|--------|
| **Đặt thời hạn cho phép hủy** | `Event.CancellationDeadlineHours` | ✅ DONE |
| **Không hủy vé đã check-in** | `TicketService.CancelTicketAsync()` kiểm tra | ✅ DONE |
| **Không hủy vé hết hạn** | `TicketStatus.Expired` check | ⚠️ PARTIAL |
| **Kiểm tra thời hạn trước sự kiện** | Logic kiểm tra deadline | ✅ DONE |
| ❌ **Role-based authorization** | Commented auth | ⚠️ PARTIAL |

**Tình trạng:** ✅ **85% hoàn thành** - Core logic có, thiếu kiểm tra vé expired

---

#### C. Cấu hình chính sách hoàn vé

| Yêu cầu | Implementation | Status |
|--------|-----------------|--------|
| **Hoàn 100%** | `FullRefundStrategy` | ✅ DONE |
| **Hoàn một phần** | `PartialRefundStrategy` (75%, 50%, 25%, 0%) | ✅ DONE |
| **Không hoàn** | `NoRefundStrategy` | ✅ DONE |
| **Strategy Pattern** | Interface `IRefundStrategy` + 3 strategies | ✅ DONE |
| **Endpoint hủy vé** | `POST /api/tickets/cancel` | ✅ DONE |
| ❌ **Áp dụng chính sách theo loại vé** | Không có `TicketType` để map strategy | ❌ MISSING |
| ❌ **Áp dụng chính sách theo thời điểm** | Chỉ có bậc thang thời gian, không có per-type | ⚠️ PARTIAL |
| **Lấy danh sách chính sách** | `GET /api/tickets/refund-policies` | ✅ DONE |

**Tình trạng:** ✅ **80% hoàn thành** - Strategy pattern tốt, thiếu liên kết với TicketType

---

#### D. Quản lý trạng thái vé

| Yêu cầu | Implementation | Status |
|--------|-----------------|--------|
| **Pending** (Chờ thanh toán) | `TicketStatus.Pending` | ✅ DONE |
| **Paid** (Đã thanh toán) | `TicketStatus.Paid` | ✅ DONE |
| **Cancelled** (Đã hủy) | `TicketStatus.Cancelled` | ✅ DONE |
| **Refunded** (Đã hoàn tiền) | `TicketStatus.Refunded` | ✅ DONE |
| **CheckedIn** (Đã check-in) | `TicketStatus.CheckedIn` | ✅ DONE |
| **Expired** (Hết hạn) | `TicketStatus.Expired` | ⚠️ ENUM_ONLY |
| **Logic chuyển trạng thái** | Có trong `CancelTicketAsync()` | ⚠️ PARTIAL |
| ❌ **Endpoint check-in** | Chỉ có logic, không có endpoint | ❌ MISSING |
| ❌ **Endpoint cập nhật trạng thái** | Không có generic update status endpoint | ❌ MISSING |
| ❌ **Tự động expire vé** | Không có job/task để expire vé | ❌ MISSING |

**Tình trạng:** ✅ **65% hoàn thành** - Enum và enum logic có, thiếu endpoints thực thi

---

### 📊 SUMMARY: Requirements vs Implementation

**Overall Status: 65% - 70% complete**

| Phần | Hoàn thành | Thiếu | Ghi chú |
|-----|-----------|------|--------|
| **2.1. Quản lý thông tin sự kiện** | 87% | 13% | CRUD OK, thiếu Status tracking |
| **2.2.A. Cấu hình thông số vé** | 30% | 70% | **CRITICAL: Cần TicketType entity** |
| **2.2.B. Chính sách hủy vé** | 85% | 15% | OK, thiếu kiểm tra expired |
| **2.2.C. Chính sách hoàn vé** | 80% | 20% | Strategy pattern tốt, thiếu per-type |
| **2.2.D. Quản lý trạng thái vé** | 65% | 35% | Enum OK, thiếu check-in endpoint |

---
## 📍 Kết luận

### ✅ Những gì đã hoàn tành:

1. **Entity Model hoàn chỉnh** cho Ticket (cá nhân & đoàn)
2. **CRUD Events** fully functional
3. **Refund Strategy** với 3 policy khác nhau
4. **Audit Tracking** tất cả hành động
5. **Database Schema** chính xác với relationships

### ❌ Những gì cần hoàn thiện cấp bách (CRITICAL):

**1. TicketType Entity & Cấu hình vé chi tiết** ⚠️ PRIORITY 1
   - ❌ Không có `TicketType` entity (VIP, Normal, Student)
   - ❌ Không có cấu hình giá theo tiers
   - ❌ Không có cấu hình thời gian mở/đóng bán per type
   - ❌ Không có giới hạn mua per người
   - ❌ Không có giới hạn số lượng per type
   - **Impact:** 70% chức năng 2.2.A không thể hoạt động
   - **Estimated effort:** 4-5 days (Entity + Service + Controller + Tests)

**2. Event Status Tracking** ⚠️ PRIORITY 2
   - ❌ Event không có `Status` field (Draft→Active→Ongoing→Completed→Cancelled)
   - ❌ Không có logic chuyển trạng thái
   - ❌ Không có validation (VD: chỉ có thể xóa event Draft, không hủy event Ongoing)
   - **Impact:** Không thể theo dõi vòng đời sự kiện
   - **Estimated effort:** 2-3 days

**3. Ticket Check-in Endpoint** ⚠️ PRIORITY 3
   - ✅ Có logic check-in trong Ticket entity
   - ❌ Không có `POST /api/tickets/{id}/checkin` endpoint
   - ❌ Không có QR code validation endpoint
   - **Impact:** Không thể quét vé tại cầu
   - **Estimated effort:** 1-2 days

**4. Ticket Status Management Endpoints** ⚠️ PRIORITY 3
   - ❌ Không có endpoint cập nhật trạng thái vé
   - ❌ Không có logic tự động expire vé
   - ❌ Không có endpoint list tickets by event/user
   - **Impact:** Admin không thể quản lý trạng thái vé chi tiết
   - **Estimated effort:** 2-3 days

**5. Chính sách hoàn vé theo loại vé** ⚠️ PRIORITY 4
   - ⚠️ Hiện tại chỉ có bậc thang theo thời gian
   - ❌ Không thể set chính sách khác nhau per ticket type
   - **Impact:** Không linh hoạt cho VIP vs Normal ticket
   - **Estimated effort:** 1-2 days (sau khi có TicketType)

---

### 🎯 Những gì vẫn OK:

1. ✅ **Event Management CRUD** - Hoàn thiện
2. ✅ **Refund Strategy Pattern** - Tốt, có 3 strategies
3. ✅ **Audit Logging** - Chi tiết, ghi log tất cả action
4. ✅ **Entity Relationships** - Đúng (Event→Tickets→SubTickets→User)
5. ✅ **Database Design** - Tốt (Foreign keys, constraints đúng)
6. ✅ **Ticket Type (Individual/Group)** - Hoàn thành, support 2 modes QR
7. ✅ **Ticket Status Enum** - Đầy đủ (6 states)
8. ✅ **Validation** - Tốt ở layer Controller + Service

---

## ⏳ Thời gian hoàn thành ước tính

| Task | Effort | Sequence |
|------|--------|----------|
| Add TicketType Entity + Migration | 3-4 days | Week 1 |
| Implement TicketTypeService & DTOs | 2 days | Week 1 |
| Implement TicketTypesController | 1 day | Week 1 |
| Add Event Status + Migration | 2 days | Week 1 |
| Implement Ticket Check-in Endpoint | 2 days | Week 2 |
| Implement Ticket Status Management | 2 days | Week 2 |
| Implement Search/Filter Events | 1-2 days | Week 2 |
| Link Refund Strategy to TicketType | 1 day | Week 3 |
| Unit Tests + Integration Tests | 3-4 days | Week 3 |
| **TOTAL** | **17-19 days** | **~4 weeks** |

---

## 📋 TODO LIST (Ordered by Priority)

- [ ] **Week 1.1:** Create `TicketType` Entity & Initial Migration
- [ ] **Week 1.2:** Create `TicketTypeService` with full CRUD
- [ ] **Week 1.3:** Create `TicketTypesController` with role-based auth
- [ ] **Week 1.4:** Add `Event.Status` field & migration
- [ ] **Week 2.1:** Implement `POST /api/tickets/{id}/checkin` endpoint
- [ ] **Week 2.2:** Implement Ticket Status Update endpoints
- [ ] **Week 2.3:** Implement Search/Filter for Events
- [ ] **Week 2.4:** Link Refund Strategy with TicketType
- [ ] **Week 3.1:** Write Unit Tests for TicketTypeService
- [ ] **Week 3.2:** Write Integration Tests
- [ ] **Week 3.3:** Swagger documentation
- [ ] **Week 3.4:** Performance optimization & database indexing

---

## � Chi tiết Implementation cho TicketType (Critical First Task)

### Tại sao TicketType quan trọng?

Hiện tại, Event chỉ có `BasePrice` chung cho toàn bộ vé. Nhưng yêu cầu là:
- VIP ticket: 500,000 VND
- Normal ticket: 300,000 VND
- Student ticket: 150,000 VND

**Solution:** Tạo Entity `TicketType` để lưu thông tin từng loại vé.

### Entities cần tạo

**File:** `Backend/TicketSystem.Domain/Entities/TicketType.cs`
```csharp
public class TicketType : BaseEntity
{
    public Guid EventId { get; set; }
    public virtual Event? Event { get; set; }
    
    public string Name { get; set; } // "VIP", "Normal", "Student"
    public string? Description { get; set; }
    public decimal Price { get; set; }
    
    public int MaxCapacity { get; set; }      // Số vé loại này tối đa
    public int RemainingCapacity { get; set; } // Số vé còn lại
    
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    
    public int MaxPerPerson { get; set; } = 5; // Tối đa mua 5 vé/người
    
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
```

### DTOs cần tạo

**File:** `Backend/TicketSystem.Application/DTOs/TicketTypeDtos.cs`
```csharp
public class CreateTicketTypeDto
{
    [Required]
    public Guid EventId { get; set; }
    
    [Required, StringLength(100)]
    public string Name { get; set; }
    
    [StringLength(500)]
    public string? Description { get; set; }
    
    [Range(0, 999999999)]
    public decimal Price { get; set; }
    
    [Range(1, 100000)]
    public int MaxCapacity { get; set; }
    
    [Required]
    public DateTime SaleStartTime { get; set; }
    
    [Required]
    public DateTime SaleEndTime { get; set; }
    
    [Range(1, 1000)]
    public int MaxPerPerson { get; set; } = 5;
}

public class TicketTypeResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int RemainingCapacity { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public bool IsOnSale { get; set; } // Kiểm tra thời gian
    public bool IsAvailable { get; set; } // Còn vé không
}
```

### Service methods

**File:** `Backend/TicketSystem.Application/Services/TicketTypeService.cs`
```
CreateTicketTypeAsync(CreateTicketTypeDto dto)
UpdateTicketTypeAsync(Guid id, UpdateTicketTypeDto dto)
GetTicketTypesByEventAsync(Guid eventId)
GetAvailableTicketTypesAsync(Guid eventId)
DeleteTicketTypeAsync(Guid id)
ReserveCapacity(Guid ticketTypeId, int quantity) // Giảm RemainingCapacity
ReleaseCapacity(Guid ticketTypeId, int quantity)  // Tăng RemainingCapacity
```

### Endpoints

```
POST   /api/events/{eventId}/ticket-types           - Tạo loại vé
GET    /api/events/{eventId}/ticket-types           - Xem tất cả loại vé
GET    /api/events/{eventId}/ticket-types/available - Xem loại vé còn bán
GET    /api/ticket-types/{id}                        - Chi tiết loại vé
PUT    /api/ticket-types/{id}                        - Cập nhật loại vé
DELETE /api/ticket-types/{id}                        - Xóa loại vé
```

### Cập nhật Entity khác

**Ticket entity** - Thêm FK:
```csharp
public Guid? TicketTypeId { get; set; }
public virtual TicketType? TicketType { get; set; }
```

**Event entity** - Cập nhật navigation:
```csharp
public virtual ICollection<TicketType> TicketTypes { get; set; } = new List<TicketType>();
```

### Database Migration

```
Migration name: AddTicketTypesTable
- Tạo table TicketTypes
- FK Event → TicketTypes (cascade delete)
- Indexes: EventId, SaleStartTime, SaleEndTime, IsActive
```

---

## �📎 Tài liệu tham khảo

- **Architecture:** Clean Architecture (Domain → Application → Infrastructure → API)
- **Database:** SQL Server 2019+, EF Core 9.0
- **Patterns:** Repository, Strategy, Dependency Injection
- **Validation:** Data Annotations + Custom Business Logic Validation

---

**Phê duyệt:** Chờ review từ Technical Lead  
**Cập nhật lần cuối:** 18/04/2026
