# Stage 1: Build ứng dụng sử dụng .NET 9.0 SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy toàn bộ file cấu hình dự án sang để khôi phục trước
COPY ["TicketSystem.API/TicketSystem.API.csproj", "TicketSystem.API/"]
COPY ["TicketSystem.Infrastructure/TicketSystem.Infrastructure.csproj", "TicketSystem.Infrastructure/"]
COPY ["TicketSystem.Application/TicketSystem.Application.csproj", "TicketSystem.Application/"]
COPY ["TicketSystem.Domain/TicketSystem.Domain.csproj", "TicketSystem.Domain/"]

# Ép khôi phục thư viện bất chấp sai lệch phiên bản nhỏ giữa các project con
RUN dotnet restore "TicketSystem.API/TicketSystem.API.csproj" /p:NoWarn=NU1605

# Copy toàn bộ mã nguồn còn lại vào trong Docker Image
COPY . .
WORKDIR "/src/TicketSystem.API"

# Biên dịch dự án API ở chế độ Release kèm cờ bỏ qua lỗi phiên bản thư viện NuGet
RUN dotnet build "TicketSystem.API.csproj" -c Release -o /app/build /p:NoWarn=NU1605

# Stage 2: Publish ứng dụng
FROM build AS publish
RUN dotnet publish "TicketSystem.API.csproj" -c Release -o /app/publish /p:UseAppHost=false /p:NoWarn=NU1605

# Stage 3: Chạy ứng dụng bằng ASP.NET Runtime sạch
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

ENTRYPOINT ["dotnet", "TicketSystem.API.dll"]