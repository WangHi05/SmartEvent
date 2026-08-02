import React, { useState, useEffect } from 'react';
import { Upload, message } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';

const AvatarUpload = ({ value, onChange, required }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value);

  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  const beforeUpload = (file) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
    if (!isImage) {
      message.error('Chỉ chấp nhận file ảnh (jpg, png, webp, gif)');
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh không được vượt quá 5MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await axiosClient.post('/upload/image', formData, {
        headers: { 'Content-Type': undefined },
        });
      const url = result.url;
      setPreviewUrl(url);
      onChange?.(url);
      onSuccess?.(result);
      message.success('Tải ảnh lên thành công');
    } catch (error) {
      console.error('Upload avatar error:', error);
      message.error(error.response?.data?.message || 'Tải ảnh thất bại');
      onError?.(error);
    } finally {
      setUploading(false);
    }
  };

  return (
  <div style={{ display: 'flex', justifyContent: 'center' }}>
    <Upload
      name="file"
      listType="picture-card"
      showUploadList={false}
      beforeUpload={beforeUpload}
      customRequest={customRequest}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
        />
      ) : (
        <div>
          {uploading ? <LoadingOutlined /> : <PlusOutlined />}
          <div style={{ marginTop: 8 }}>{required ? 'Ảnh (bắt buộc)' : 'Ảnh (tùy chọn)'}</div>
        </div>
      )}
    </Upload>
  </div>
  );
};

export default AvatarUpload;