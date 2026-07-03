# Stage 1: Build ứng dụng sử dụng .NET 9.0 SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy tất cả các file dự án .csproj sang trước để restore dependencies
COPY ["TicketSystem.API/TicketSystem.API.csproj", "TicketSystem.API/"]
COPY ["TicketSystem.Infrastructure/TicketSystem.Infrastructure.csproj", "TicketSystem.Infrastructure/"]
COPY ["TicketSystem.Core/TicketSystem.Core.csproj", "TicketSystem.Core/"]
COPY ["TicketSystem.Application/TicketSystem.Application.csproj", "TicketSystem.Application/"]
COPY ["TicketSystem.Domain/TicketSystem.Domain.csproj", "TicketSystem.Domain/"]

# Thực hiện khôi phục các thư viện NuGet
RUN dotnet restore "TicketSystem.API/TicketSystem.API.csproj"

# Copy toàn bộ mã nguồn còn lại vào trong Docker Image
COPY . .
WORKDIR "/src/TicketSystem.API"

# Biên dịch dự án API ở chế độ Release
RUN dotnet build "TicketSystem.API.csproj" -c Release -o /app/build

# Stage 2: Publish ứng dụng
FROM build AS publish
RUN dotnet publish "TicketSystem.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Chạy ứng dụng bằng ASP.NET Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

ENTRYPOINT ["dotnet", "TicketSystem.API.dll"]