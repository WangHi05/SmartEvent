using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace TicketSystem.API.Services
{
    public class UploadService
    {
        private readonly Cloudinary _cloudinary;

        public UploadService(Cloudinary cloudinary)
        {
            _cloudinary = cloudinary;
        }

        /// Upload ảnh lên Cloudinary, trả về URL ảnh (https)
        public async Task<string> UploadImageAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File ảnh không hợp lệ.");

            // Giới hạn dung lượng file (ví dụ tối đa 5MB)
            if (file.Length > 5 * 1024 * 1024)
                throw new ArgumentException("Kích thước ảnh không được vượt quá 5MB.");

            // Chỉ cho phép các định dạng ảnh phổ biến
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Chỉ chấp nhận file ảnh định dạng: jpg, jpeg, png, webp, gif.");

            await using var stream = file.OpenReadStream();

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "ticketsystem/events", // ảnh sự kiện sẽ lưu trong thư mục này trên Cloudinary
                Transformation = new Transformation().Quality("auto").FetchFormat("auto")
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
                throw new Exception($"Upload ảnh thất bại: {uploadResult.Error.Message}");

            return uploadResult.SecureUrl.ToString();
        }
    }
}