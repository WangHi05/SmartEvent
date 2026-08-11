# Stage 1: Build ứng dụng sử dụng .NET 9.0 SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy toàn bộ file cấu hình dự án sang để quản lý dependencies
COPY ["TicketSystem.API/TicketSystem.API.csproj", "TicketSystem.API/"]
COPY ["TicketSystem.Infrastructure/TicketSystem.Infrastructure.csproj", "TicketSystem.Infrastructure/"]
COPY ["TicketSystem.Application/TicketSystem.Application.csproj", "TicketSystem.Application/"]
COPY ["TicketSystem.Domain/TicketSystem.Domain.csproj", "TicketSystem.Domain/"]

# Thực hiện khôi phục các thư viện NuGet đã đồng bộ
RUN dotnet restore "TicketSystem.API/TicketSystem.API.csproj"

# Copy toàn bộ mã nguồn còn lại vào trong Docker Image
COPY . .
WORKDIR "/src/TicketSystem.API"

# Biên dịch dự án API ở chế độ Release
RUN dotnet build "TicketSystem.API.csproj" -c Release -o /app/build

# Stage 2: Publish ứng dụng để gom các file dll cần thiết
FROM build AS publish
RUN dotnet publish "TicketSystem.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Chạy ứng dụng bằng ASP.NET Runtime sạch
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

# ---> THÊM ĐOẠN NÀY ĐỂ CÀI ĐẶT MÚI GIỜ CHO LINUX CONTAINER <---
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

ENTRYPOINT ["dotnet", "TicketSystem.API.dll"]